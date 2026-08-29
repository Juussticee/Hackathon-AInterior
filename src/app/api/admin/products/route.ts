import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";
import { generateId } from "@/lib/utils";

// GET /api/admin/products (paginated)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const category = searchParams.get("category");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const offset = (page - 1) * limit;

  let countQuery = `SELECT COUNT(*) as cnt FROM products p JOIN companies c ON p.company_id = c.id WHERE 1=1`;
  let query = `SELECT p.*, c.name as company_name FROM products p JOIN companies c ON p.company_id = c.id WHERE 1=1`;
  const params: (string | number)[] = [];
  const countParams: (string | number)[] = [];

  if (companyId) {
    query += ` AND p.company_id = ?`;
    countQuery += ` AND p.company_id = ?`;
    params.push(companyId);
    countParams.push(companyId);
  }
  if (category) {
    query += ` AND p.subcategory = ?`;
    countQuery += ` AND p.subcategory = ?`;
    params.push(category);
    countParams.push(category);
  }

  const total = (db.prepare(countQuery).get(...countParams) as { cnt: number }).cnt;

  query += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const products = db.prepare(query).all(...params);
  return NextResponse.json({ products, total, page, limit, pages: Math.ceil(total / limit) });
}

// POST /api/admin/products — Create product
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();

    // Validate required fields
    if (!body.name || typeof body.name !== "string" || body.name.trim().length < 2) {
      return NextResponse.json({ error: "Product name is required (min 2 chars)" }, { status: 400 });
    }
    if (!body.companyId) {
      return NextResponse.json({ error: "Company is required" }, { status: 400 });
    }
    if (!body.priceAed || Number(body.priceAed) <= 0) {
      return NextResponse.json({ error: "Price must be a positive number" }, { status: 400 });
    }

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
