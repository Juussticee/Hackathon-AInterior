import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";
import { generateId } from "@/lib/utils";
import { styles } from "@/lib/styles";

const VALID_ROOM_TYPES = ["bedroom", "living_room", "dining_room", "office", "studio", "kids_room"];
const VALID_STYLES = styles.map((s) => s.slug);

// GET /api/designs — List user's designs (paginated)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "12", 10)));
  const offset = (page - 1) * limit;

  const userId = (session.user as { id: string }).id;
  const total = (
    db
      .prepare("SELECT COUNT(*) as cnt FROM design_projects WHERE user_id = ?")
      .get(userId) as { cnt: number }
  ).cnt;

  const designs = db
    .prepare(
      "SELECT * FROM design_projects WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
    )
    .all(userId, limit, offset);

  return NextResponse.json({ designs, total, page, limit, pages: Math.ceil(total / limit) });
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

    const missing: string[] = [];
    if (!roomType) missing.push("roomType");
    if (!roomLengthCm) missing.push("roomLengthCm");
    if (!roomWidthCm) missing.push("roomWidthCm");
    if (!styleSlug) missing.push("styleSlug");
    if (!budgetAed) missing.push("budgetAed");
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    // Input validation
    if (!VALID_ROOM_TYPES.includes(roomType)) {
      return NextResponse.json(
        { error: `Invalid room type. Must be one of: ${VALID_ROOM_TYPES.join(", ")}` },
        { status: 400 }
      );
    }
    const lengthNum = Number(roomLengthCm);
    const widthNum = Number(roomWidthCm);
    const budgetNum = Number(budgetAed);
    if (!lengthNum || lengthNum < 100 || lengthNum > 2000 || !widthNum || widthNum < 100 || widthNum > 2000) {
      return NextResponse.json(
        { error: "Room dimensions must be between 100cm and 2000cm" },
        { status: 400 }
      );
    }
    if (!budgetNum || budgetNum < 500 || budgetNum > 500000) {
      return NextResponse.json(
        { error: "Budget must be between AED 500 and AED 500,000" },
        { status: 400 }
      );
    }
    if (typeof styleSlug !== "string" || styleSlug.length > 50 || !VALID_STYLES.includes(styleSlug)) {
      return NextResponse.json(
        { error: `Invalid style. Must be one of: ${VALID_STYLES.join(", ")}` },
        { status: 400 }
      );
    }
    // Optional field validation
    if (roomHeightCm != null) {
      const h = Number(roomHeightCm);
      if (!h || h < 150 || h > 600) {
        return NextResponse.json({ error: "Height must be between 150cm and 600cm" }, { status: 400 });
      }
    }
    if (additionalRequirements && typeof additionalRequirements === "string" && additionalRequirements.length > 2000) {
      return NextResponse.json({ error: "Requirements text must be under 2000 characters" }, { status: 400 });
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
      lengthNum,
      widthNum,
      roomHeightCm ? Number(roomHeightCm) : null,
      existingFurniture || null,
      additionalRequirements || null,
      styleSlug,
      budgetNum,
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
