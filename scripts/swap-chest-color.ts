import db from "../src/lib/db";

const OLD_ID = "042241c2-544c-4a40-81ef-efce85bf3e79";
const NEW_ID = "3c1f2078-717b-45d0-8c98-b73c0ed077aa";

const rows = db.prepare("SELECT id, selected_products FROM design_projects").all() as Array<{
  id: string;
  selected_products: string;
}>;

let count = 0;
for (const row of rows) {
  const selected = JSON.parse(row.selected_products || "[]") as Array<{
    productId: string;
    reason: string;
    category: string;
  }>;
  let changed = false;
  for (const item of selected) {
    if (item.productId === OLD_ID) {
      item.productId = NEW_ID;
      changed = true;
    }
  }
  if (changed) {
    db.prepare(
      "UPDATE design_projects SET selected_products = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(JSON.stringify(selected), row.id);
    count++;
    console.log("Updated design:", row.id);
  }
}

console.log("Updated", count, "design(s) to use French Sonoma Oak chest");
