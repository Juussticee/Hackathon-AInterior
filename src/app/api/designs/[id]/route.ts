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

  // Auto-transition stuck 'processing' designs (>5 min) to 'failed'.
  // This handles server restarts that kill in-flight pipeline executions.
  if (design.status === "processing") {
    const updated = new Date(design.updated_at as string).getTime();
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    if (updated < fiveMinAgo) {
      db.prepare(
        "UPDATE design_projects SET status = 'failed', updated_at = datetime('now') WHERE id = ?"
      ).run(id);
      design.status = "failed";
    }
  }

  // Parse JSON fields
  if (typeof design.space_analysis === "string") {
    try { design.space_analysis = JSON.parse(design.space_analysis); } catch { design.space_analysis = null; }
  }
  if (typeof design.selected_products === "string") {
    try {
    const selected = JSON.parse(design.selected_products);
    // Batch-fetch all products with WHERE IN to avoid N+1
    const productIds = selected.map((sp: { productId: string }) => sp.productId).filter(Boolean);
    const productMap = new Map<string, Record<string, unknown>>();
    if (productIds.length > 0) {
      const placeholders = productIds.map(() => "?").join(",");
      const rows = db
        .prepare(
          `SELECT p.*, c.name as company_name FROM products p
           JOIN companies c ON p.company_id = c.id
           WHERE p.id IN (${placeholders})`
        )
        .all(...productIds) as Record<string, unknown>[];
      for (const row of rows) {
        productMap.set(row.id as string, row);
      }
    }
    design.selected_products = selected
      .map((sp: { productId: string; reason: string; category: string }) => {
        const product = productMap.get(sp.productId);
        return product ? { ...sp, product } : null;
      })
      .filter(Boolean);
    } catch { design.selected_products = []; }
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
    // Guard: if the design is currently being processed, allow re-run only
    // if it's been stuck for >5 minutes (server restart recovery).
    if (design.status === "processing") {
      const updated = new Date(design.updated_at as string).getTime();
      const fiveMinAgo = Date.now() - 5 * 60 * 1000;
      if (updated >= fiveMinAgo) {
        return NextResponse.json(
          { error: "Design is currently being generated. Please wait." },
          { status: 409 }
        );
      }
      // Stuck — allow re-run
    }

    // Overall pipeline timeout: 3 minutes max (covers Gemini + Pollinations calls)
    const PIPELINE_TIMEOUT_MS = 180_000;
    const result = await Promise.race([
      runDesignPipeline({
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
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Pipeline timed out after 3 minutes")), PIPELINE_TIMEOUT_MS)
      ),
    ]);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Design pipeline error:", error);
    db.prepare(
      "UPDATE design_projects SET status = 'failed', updated_at = datetime('now') WHERE id = ?"
    ).run(id);
    return NextResponse.json(
      { error: `Design generation failed: ${message}` },
      { status: 500 }
    );
  }
}
