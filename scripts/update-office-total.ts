import db from "../src/lib/db";

const OFFICE_PROJECT_ID = "85ab0f81-65ab-4bab-85dd-82c050359cb2";

const row = db
  .prepare("SELECT selected_products FROM design_projects WHERE id = ?")
  .get(OFFICE_PROJECT_ID) as { selected_products: string } | undefined;

if (row) {
  const selected = JSON.parse(row.selected_products || "[]") as Array<{ productId: string }>;
  let total = 0;
  for (const item of selected) {
    const product = db.prepare("SELECT price_aed FROM products WHERE id = ?").get(item.productId) as
      | { price_aed: number }
      | undefined;
    total += product?.price_aed || 0;
  }
  db.prepare(
    "UPDATE design_projects SET total_cost_aed = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(total, OFFICE_PROJECT_ID);
  console.log("Updated total cost to AED", total);
}
