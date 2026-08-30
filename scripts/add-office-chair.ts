import db from "../src/lib/db";
import { generateId } from "../src/lib/utils";

const newId = generateId();
const DANUBE_HOME_ID = "fdf89bc7-aba7-4c76-8ff0-219fef2291e3";
const OFFICE_PROJECT_ID = "85ab0f81-65ab-4bab-85dd-82c050359cb2";

// Add Melodica Mid Back Office Chair - Dark Grey
db.prepare(
  `INSERT INTO products (
    id, company_id, sku, name, category, subcategory,
    price_aed, original_price_aed, currency, product_url, affiliate_url,
    main_image_url, gallery_urls, length_cm, width_cm, height_cm,
    materials, colors, description, style_tags, room_types,
    min_room_area_sqm, price_tier, is_available, is_featured,
    created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
).run(
  newId,
  DANUBE_HOME_ID,
  "811900300147",
  "Melodica Mid Back Office Chair - Dark Grey",
  "furniture",
  "desk-chairs",
  129,
  179,
  "AED",
  "https://www.danubehome.com/ae/en/p/melodica-mid-back-office-chair-dark-grey-811900300147",
  null,
  "https://assets.danubehome.com/media/dh-seller/p/assets/811900300147/19/715/811900300147-JS1.jpg",
  "[]",
  45,
  50,
  89,
  "Molded Resin, Fabric Upholstery",
  '["Dark Grey"]',
  "Ergonomic mid-back office chair with molded resin frame, mesh fabric seating, gas lift adjustment and revolving wheels.",
  '["minimalist","office","desk-chair","ergonomic","dark-grey"]',
  '["office","study"]',
  null,
  "economy",
  1,
  0
);

console.log("Added desk chair:", newId);

// Add to office project selected products
const row = db
  .prepare("SELECT selected_products FROM design_projects WHERE id = ?")
  .get(OFFICE_PROJECT_ID) as { selected_products: string } | undefined;

if (row) {
  const selected = JSON.parse(row.selected_products || "[]") as Array<{
    productId: string;
    reason: string;
    category: string;
  }>;
  selected.push({
    productId: newId,
    reason: "Dark grey ergonomic desk chair that complements the minimalist office palette and provides comfortable seating at the study desk.",
    category: "desk-chair",
  });
  db.prepare(
    "UPDATE design_projects SET selected_products = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(JSON.stringify(selected), OFFICE_PROJECT_ID);
  console.log("Added chair to office project:", OFFICE_PROJECT_ID);
}
