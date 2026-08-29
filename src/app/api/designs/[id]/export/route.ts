import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";

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

  // Parse and enrich products
  let products: Array<{
    productId: string;
    reason: string;
    category: string;
    product: Record<string, unknown>;
  }> = [];

  if (typeof design.selected_products === "string") {
    const selected = JSON.parse(design.selected_products);
    products = selected
      .map((sp: { productId: string; reason: string; category: string }) => {
        const product = db
          .prepare(
            `SELECT p.*, c.name as company_name FROM products p
             JOIN companies c ON p.company_id = c.id
             WHERE p.id = ?`
          )
          .get(sp.productId) as Record<string, unknown> | undefined;
        return product ? { ...sp, product } : null;
      })
      .filter(Boolean);
  }

  const roomType = String(design.room_type ?? "").replace(/_/g, " ");
  const styleSlug = String(design.style_slug ?? "");
  const lengthCm = Number(design.room_length_cm ?? 0);
  const widthCm = Number(design.room_width_cm ?? 0);
  const budget = Number(design.budget_aed ?? 0);
  const totalCost = Number(design.total_cost_aed ?? 0);
  const explanation = String(design.design_explanation ?? "");
  const vizUrl = design.visualization_url as string | null;
  const createdAt = String(design.created_at ?? "");
  const savings = budget > totalCost ? budget - totalCost : 0;

  const productRows = products
    .map((sp) => {
      const p = sp.product;
      const name = String(p.name ?? "");
      const company = String(p.company_name ?? "");
      const price = Number(p.price_aed ?? 0);
      const origPrice = p.original_price_aed ? Number(p.original_price_aed) : null;
      const imgUrl = String(p.main_image_url ?? "");
      const prodUrl = String(p.product_url ?? "");
      const sub = String(p.subcategory ?? "").replace(/-/g, " ");
      const length = p.length_cm ? `${p.length_cm}cm` : "";
      const width = p.width_cm ? `${p.width_cm}cm` : "";
      const height = p.height_cm ? `${p.height_cm}cm` : "";
      const dims = [length, width, height].filter(Boolean).join(" × ");

      return `<tr>
        <td class="prod-img"><img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(name)}" /></td>
        <td>
          <div class="prod-name">${escapeHtml(name)}</div>
          <div class="prod-meta">${escapeHtml(sub)}${dims ? ` — ${escapeHtml(dims)}` : ""}</div>
          <div class="prod-retailer">${escapeHtml(company)}</div>
        </td>
        <td class="prod-price">
          AED ${price.toLocaleString()}
          ${origPrice && origPrice > price ? `<span class="prod-orig">AED ${origPrice.toLocaleString()}</span>` : ""}
        </td>
        <td><a href="${escapeHtml(prodUrl)}" class="buy-link">Buy →</a></td>
      </tr>`;
    })
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AInterior — ${escapeHtml(styleSlug)} ${escapeHtml(roomType)} Design</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #2c2418; background: #fff; line-height: 1.5; }
    .page { max-width: 800px; margin: 0 auto; padding: 40px 24px; }

    /* Header */
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; padding-bottom: 16px; border-bottom: 2px solid #f5f0eb; }
    .logo { font-size: 20px; font-weight: 700; color: #2c2418; letter-spacing: -0.5px; }
    .logo span { display: inline-flex; width: 28px; height: 28px; background: #6b5b45; color: #fff; border-radius: 6px; align-items: center; justify-content: center; font-size: 14px; margin-right: 8px; }
    .date { font-size: 12px; color: #8b7355; }

    /* Room Info */
    .room-info { background: #faf8f5; border-radius: 12px; padding: 20px 24px; margin-bottom: 28px; }
    .room-title { font-size: 22px; font-weight: 700; margin-bottom: 4px; text-transform: capitalize; }
    .room-sub { font-size: 13px; color: #8b7355; }
    .room-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 16px; }
    .room-stat label { font-size: 11px; color: #8b7355; text-transform: uppercase; letter-spacing: 0.5px; }
    .room-stat .val { font-size: 16px; font-weight: 600; color: #2c2418; }

    /* Visualization */
    .viz { margin-bottom: 28px; border-radius: 12px; overflow: hidden; }
    .viz img { width: 100%; height: auto; display: block; }

    /* Explanation */
    .explanation { background: #faf8f5; border-left: 3px solid #c4a882; padding: 16px 20px; margin-bottom: 28px; font-size: 14px; color: #4a4035; white-space: pre-line; }

    /* Products */
    .section-title { font-size: 16px; font-weight: 700; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
    .section-title::before { content: ''; display: block; width: 3px; height: 16px; background: #6b5b45; border-radius: 2px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
    th { text-align: left; font-size: 11px; color: #8b7355; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 12px; border-bottom: 1px solid #e8ddd3; }
    td { padding: 12px; border-bottom: 1px solid #f5f0eb; vertical-align: middle; }
    .prod-img img { width: 56px; height: 56px; object-fit: cover; border-radius: 8px; }
    .prod-name { font-size: 13px; font-weight: 600; color: #2c2418; margin-bottom: 2px; }
    .prod-meta { font-size: 11px; color: #8b7355; }
    .prod-retailer { font-size: 11px; color: #6b5b45; font-weight: 500; margin-top: 2px; }
    .prod-price { font-size: 14px; font-weight: 700; color: #2c2418; white-space: nowrap; }
    .prod-orig { display: block; font-size: 11px; color: #8b7355; text-decoration: line-through; font-weight: 400; }
    .buy-link { font-size: 12px; color: #6b5b45; text-decoration: none; font-weight: 600; white-space: nowrap; }

    /* Cost Summary */
    .cost-box { background: #faf8f5; border-radius: 12px; padding: 20px 24px; margin-bottom: 28px; }
    .cost-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
    .cost-row.total { border-top: 2px solid #e8ddd3; margin-top: 8px; padding-top: 12px; font-size: 18px; font-weight: 700; }
    .cost-row.savings { color: #16a34a; font-weight: 600; }

    /* Footer */
    .footer { text-align: center; font-size: 11px; color: #c4a882; padding-top: 20px; border-top: 1px solid #f5f0eb; }

    /* Print */
    @media print {
      body { background: #fff; }
      .page { padding: 20px; max-width: none; }
      .no-print { display: none !important; }
      tr { break-inside: avoid; }
    }

    /* Print button */
    .print-bar { text-align: center; margin-bottom: 20px; }
    .print-btn { display: inline-flex; align-items: center; gap: 6px; background: #6b5b45; color: #fff; border: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; }
    .print-btn:hover { background: #4a4035; }
  </style>
</head>
<body>
  <div class="page">
    <div class="print-bar no-print">
      <button class="print-btn" onclick="window.print()">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Print / Save as PDF
      </button>
    </div>

    <div class="header">
      <div class="logo"><span>A</span>AInterior</div>
      <div class="date">${escapeHtml(new Date(createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }))}</div>
    </div>

    <div class="room-info">
      <div class="room-title">${escapeHtml(styleSlug.charAt(0).toUpperCase() + styleSlug.slice(1))} ${escapeHtml(roomType.charAt(0).toUpperCase() + roomType.slice(1))}</div>
      <div class="room-sub">AI-Powered Interior Design</div>
      <div class="room-grid">
        <div class="room-stat">
          <label>Dimensions</label>
          <div class="val">${lengthCm} × ${widthCm} cm</div>
        </div>
        <div class="room-stat">
          <label>Area</label>
          <div class="val">${((lengthCm / 100) * (widthCm / 100)).toFixed(1)} m²</div>
        </div>
        <div class="room-stat">
          <label>Budget</label>
          <div class="val">AED ${budget.toLocaleString()}</div>
        </div>
        <div class="room-stat">
          <label>Items</label>
          <div class="val">${products.length}</div>
        </div>
      </div>
    </div>

    ${vizUrl ? `<div class="viz"><img src="${escapeHtml(vizUrl)}" alt="Room visualization" /></div>` : ""}

    ${explanation ? `<div class="section-title">Design Concept</div><div class="explanation">${escapeHtml(explanation)}</div>` : ""}

    ${products.length > 0 ? `
    <div class="section-title">Recommended Products</div>
    <table>
      <thead>
        <tr><th></th><th>Product</th><th>Price</th><th></th></tr>
      </thead>
      <tbody>
        ${productRows}
      </tbody>
    </table>
    ` : ""}

    <div class="cost-box">
      <div class="section-title" style="margin-bottom:8px">Cost Summary</div>
      <div class="cost-row"><span>Budget</span><span>AED ${budget.toLocaleString()}</span></div>
      <div class="cost-row total"><span>Total Cost</span><span>AED ${totalCost.toLocaleString()}</span></div>
      ${savings > 0 ? `<div class="cost-row savings"><span>Under budget</span><span>AED ${savings.toLocaleString()}</span></div>` : ""}
    </div>

    <div class="footer">
      Generated by AInterior — AI-powered interior design · ${escapeHtml(new Date(createdAt).toLocaleDateString())}
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
