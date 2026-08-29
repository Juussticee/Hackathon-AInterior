import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";
import { runDesignPipeline } from "@/lib/ai-engine";
import type { RoomType } from "@/lib/types";

// GET /api/designs/[id] — Get specific design
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const design = db
    .prepare("SELECT * FROM design_projects WHERE id = ?")
    .get(id) as Record<string, unknown> | undefined;

  if (!design) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const userId = (session.user as { id: string }).id;
  const userRole = (session.user as { role?: string }).role;
  if (design.user_id !== userId && userRole !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Parse JSON fields
  if (typeof design.space_analysis === "string") {
    design.space_analysis = JSON.parse(design.space_analysis);
  }
  if (typeof design.selected_products === "string") {
    const selected = JSON.parse(design.selected_products);
    // Enrich with full product data
    design.selected_products = selected
      .map((sp: { productId: string; reason: string; category: string }) => {
        const product = db
          .prepare(
            `SELECT p.*, c.name as company_name FROM products p
             JOIN companies c ON p.company_id = c.id
             WHERE p.id = ?`
          )
          .get(sp.productId);
        return product ? { ...sp, product } : null;
      })
      .filter(Boolean);
  }

  return NextResponse.json({ design });
}

// DELETE /api/designs/[id] — Delete a design project
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const design = db
    .prepare("SELECT id, user_id, visualization_url FROM design_projects WHERE id = ?")
    .get(id) as { id: string; user_id: string; visualization_url: string | null } | undefined;

  if (!design) {
    return NextResponse.json({ error: "Design not found" }, { status: 404 });
  }

  const userId = (session.user as { id: string }).id;
  const userRole = (session.user as { role?: string }).role;
  if (design.user_id !== userId && userRole !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Delete the design row
    db.prepare("DELETE FROM design_projects WHERE id = ?").run(id);

    // Clean up local visualization file if it exists
    if (design.visualization_url?.startsWith("/uploads/")) {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.join(process.cwd(), "public", design.visualization_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete design error:", error);
    return NextResponse.json({ error: "Failed to delete design" }, { status: 500 });
  }
}

// POST /api/designs/[id]/generate — Trigger AI pipeline
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const design = db
    .prepare("SELECT * FROM design_projects WHERE id = ?")
    .get(id) as Record<string, unknown> | undefined;

  if (!design) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const userId = (session.user as { id: string }).id;
  if (design.user_id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await runDesignPipeline({
      projectId: id,
      roomImageUrl: design.room_image_url as string | null,
      roomType: design.room_type as RoomType,
      dimensions: {
        length: design.room_length_cm as number,
        width: design.room_width_cm as number,
        height: design.room_height_cm as number | undefined,
      },
      styleSlug: design.style_slug as string,
      budgetAed: design.budget_aed as number,
      additionalRequirements: design.additional_requirements as string | null,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Design pipeline error:", error);
    db.prepare(
      "UPDATE design_projects SET status = 'failed', updated_at = datetime('now') WHERE id = ?"
    ).run(id);
    return NextResponse.json(
      { error: "Design generation failed. Please try again." },
      { status: 500 }
    );
  }
}
