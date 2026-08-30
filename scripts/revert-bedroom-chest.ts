import db from "../src/lib/db";

const LIGHT_WALNUT_ID = "042241c2-544c-4a40-81ef-efce85bf3e79";
const SONOMA_ID = "3c1f2078-717b-45d0-8c98-b73c0ed077aa";

const bedroomIds = [
  "19d1ce12-6a56-437a-84d8-fef6c6e684cc",
  "dd341713-dd9e-4cb1-8423-844dccc6f7e3",
];

for (const id of bedroomIds) {
  const row = db
    .prepare("SELECT selected_products FROM design_projects WHERE id = ?")
    .get(id) as { selected_products: string } | undefined;
  if (!row) continue;

  const selected = JSON.parse(row.selected_products || "[]") as Array<{
    productId: string;
    reason: string;
    category: string;
  }>;

  let changed = false;
  for (const item of selected) {
    if (item.productId === SONOMA_ID) {
      item.productId = LIGHT_WALNUT_ID;
      changed = true;
    }
  }

  if (changed) {
    db.prepare(
      "UPDATE design_projects SET selected_products = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(JSON.stringify(selected), id);
    console.log("Reverted bedroom design:", id);
  }
}
