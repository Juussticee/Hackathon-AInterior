import db from "../src/lib/db";
import { generateId } from "../src/lib/utils";

const DANUBE_HOME_ID = "fdf89bc7-aba7-4c76-8ff0-219fef2291e3";
const OFFICE_PROJECT_ID = "85ab0f81-65ab-4bab-85dd-82c050359cb2";
const OLD_CHAIR_ID = "fb55fba1-a9b0-4a97-9123-4cfd7b8e809d";

const newId = generateId();

// Add Jeffcoco chair
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
  "179900123113",
  "Jeffcoco Wooden Leg Leather Cushion Seat Chair - White",
  "furniture",
  "desk-chairs",
  125,
  null,
  "AED",
  "https://www.danubehome.com/ae/en/p/jeffcoco-furniture-wooden-leg-leather-cusion-seat-chair-for-dining-desk-chair-white-1-pcs-179900123113",
  null,
  "https://assets.danubehome.com/media/dh-seller/p/sellers/JEFFCOCO-FURNITURE/pi/179900123113/image_1745251326093.jpeg",
  "[]",
  47,
  50,
  81,
  "Plastic, Leather Cushion, Wooden Legs",
  '["White"]',
  "Sturdy plastic chair with leather cushion seat and wooden legs, suitable for dining or desk use in a minimalist office.",
  '["minimalist","office","desk-chair","dining-chair","white","wooden-legs"]',
  '["office","study","dining_room"]',
  null,
  "economy",
  1,
  0
);

console.log("Added Jeffcoco chair:", newId);

// Replace chair in office project
const row = db
  .prepare("SELECT selected_products FROM design_projects WHERE id = ?")
  .get(OFFICE_PROJECT_ID) as { selected_products: string } | undefined;

if (row) {
  const selected = JSON.parse(row.selected_products || "[]") as Array<{
    productId: string;
    reason: string;
    category: string;
  }>;

  const newSelected = selected.map((item) => {
    if (item.productId === OLD_CHAIR_ID) {
      return {
        productId: newId,
        reason: "White leather-cushion chair with wooden legs that brightens the minimalist office and complements the Summer Oak/Pearl White desk.",
        category: "desk-chair",
      };
    }
    return item;
  });

  db.prepare(
    "UPDATE design_projects SET selected_products = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(JSON.stringify(newSelected), OFFICE_PROJECT_ID);
  console.log("Replaced chair in office project");
}
