import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";
import { generateId } from "@/lib/utils";

// GET /api/admin/companies
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companies = db
    .prepare(
      `SELECT c.*, COUNT(p.id) as product_count
       FROM companies c
       LEFT JOIN products p ON p.company_id = c.id
       GROUP BY c.id
       ORDER BY c.name`
    )
    .all();

  return NextResponse.json({ companies });
}

// POST /api/admin/companies — Create company
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { name, slug, website } = await req.json();
    const id = generateId();

    db.prepare(
      "INSERT INTO companies (id, name, slug, website, enabled) VALUES (?, ?, ?, ?, 1)"
    ).run(id, name, slug, website || null);

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error("Create company error:", error);
    return NextResponse.json({ error: "Failed to create company" }, { status: 500 });
  }
}
