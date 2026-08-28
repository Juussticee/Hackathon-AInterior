import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";
import { generateId } from "@/lib/utils";

// GET /api/admin/products
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const category = searchParams.get("category");

  let query = `SELECT p.*, c.name as company_name FROM products p JOIN companies c ON p.company_id = c.id WHERE 1=1`;
  const params: (string | number)[] = [];

  if (companyId) {
    query += ` AND p.company_id = ?`;
    params.push(companyId);
  }
  if (category) {
    query += ` AND p.subcategory = ?`;
    params.push(category);
  }

  query += ` ORDER BY p.created_at DESC`;

  const products = db.prepare(query).all(...params);
  return NextResponse.json({ products });
}

// POST /api/admin/products — Create product
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const id = generateId();

    db.prepare(
      `INSERT INTO products
        (id, name, company_id, sku, category, subcategory, price_aed, original_price_aed,
         currency, product_url, main_image_url, materials, colors, description,
         style_tags, room_types, price_tier, is_available, is_featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      body.name,
      body.companyId,
      body.sku || null,
      body.category || "furniture",
      body.subcategory,
      body.priceAed,
      body.originalPriceAed || null,
      "AED",
      body.productUrl,
      body.mainImageUrl,
      body.materials || null,
      JSON.stringify(body.colors || []),
      body.description || null,
      JSON.stringify(body.styleTags || ["minimalist", "japandi"]),
      JSON.stringify(body.roomTypes || ["bedroom", "living_room"]),
      body.priceTier || "moderate",
      body.isAvailable !== false ? 1 : 0,
      body.isFeatured ? 1 : 0
    );

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error("Create product error:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
