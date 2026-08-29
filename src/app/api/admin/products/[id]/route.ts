import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";

// PATCH /api/admin/products/[id] — Update product fields
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = db.prepare("SELECT id FROM products WHERE id = ?").get(id);
  if (!existing) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const updates: string[] = [];
    const values: unknown[] = [];

    const allowedFields: Record<string, string> = {
      name: "name",
      subcategory: "subcategory",
      priceAed: "price_aed",
      originalPriceAed: "original_price_aed",
      productUrl: "product_url",
      mainImageUrl: "main_image_url",
      materials: "materials",
      description: "description",
      isAvailable: "is_available",
      isFeatured: "is_featured",
    };

    for (const [key, column] of Object.entries(allowedFields)) {
      if (key in body) {
        if (key === "isAvailable" || key === "isFeatured") {
          updates.push(`${column} = ?`);
          values.push(body[key] ? 1 : 0);
        } else if (key === "priceAed" || key === "originalPriceAed") {
          updates.push(`${column} = ?`);
          values.push(body[key] != null ? Number(body[key]) : null);
        } else {
          updates.push(`${column} = ?`);
          values.push(body[key] ?? null);
        }
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    updates.push("updated_at = datetime('now')");
    values.push(id);

    db.prepare(`UPDATE products SET ${updates.join(", ")} WHERE id = ?`).run(...values);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update product error:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

// DELETE /api/admin/products/[id] — Remove product
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = db.prepare("SELECT id FROM products WHERE id = ?").get(id);
  if (!existing) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  try {
    db.prepare("DELETE FROM products WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete product error:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
