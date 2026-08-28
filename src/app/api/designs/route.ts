import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";
import { generateId } from "@/lib/utils";

// GET /api/designs — List user's designs
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const designs = db
    .prepare(
      "SELECT * FROM design_projects WHERE user_id = ? ORDER BY created_at DESC"
    )
    .all(userId);

  return NextResponse.json({ designs });
}

// POST /api/designs — Create new design project
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      roomType,
      roomImageUrl,
      roomLengthCm,
      roomWidthCm,
      roomHeightCm,
      existingFurniture,
      additionalRequirements,
      styleSlug,
      budgetAed,
      budgetTier,
    } = body;

    if (!roomType || !roomLengthCm || !roomWidthCm || !styleSlug || !budgetAed) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const id = generateId();
    const userId = (session.user as { id: string }).id;

    db.prepare(
      `INSERT INTO design_projects
        (id, user_id, room_type, room_image_url, room_length_cm, room_width_cm,
         room_height_cm, existing_furniture, additional_requirements,
         style_slug, budget_aed, budget_tier, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`
    ).run(
      id,
      userId,
      roomType,
      roomImageUrl || null,
      roomLengthCm,
      roomWidthCm,
      roomHeightCm || null,
      existingFurniture || null,
      additionalRequirements || null,
      styleSlug,
      budgetAed,
      budgetTier || "moderate"
    );

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error("Create design error:", error);
    return NextResponse.json(
      { error: "Failed to create design" },
      { status: 500 }
    );
  }
}
