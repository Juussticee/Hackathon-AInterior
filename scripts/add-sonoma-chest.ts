import db from "../src/lib/db";
import { generateId } from "../src/lib/utils";

const newId = generateId();

const existing = db
  .prepare("SELECT * FROM products WHERE id = ?")
  .get("042241c2-544c-4a40-81ef-efce85bf3e79") as Record<string, unknown>;

if (!existing) {
  console.error("Existing Light Walnut product not found");
  process.exit(1);
}

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
  existing.company_id,
  "810101800388",
  "Supreme Chest of 5 Drawers - French Sonoma Oak",
  existing.category,
  existing.subcategory,
  399,
  545,
  existing.currency,
  "https://www.danubehome.com/ae/en/p/supreme-chest-of-5drawers-french-sonoma-oak-810101800455",
  null,
  "https://assets.danubehome.com/media/dh-seller/p/assets/810101800388/400x400/16/9/810101800388-sprzd-9.jpg",
  "[]",
  80,
  40.5,
  116,
  existing.materials,
  '["French Sonoma Oak"]',
  "5-drawer chest in French Sonoma Oak. Part of the Supreme collection. Clean vertical storage solution with minimalist drawer fronts.",
  '["minimalist","chest-of-drawers","french-sonoma-oak","bedroom-storage","clean-lines"]',
  existing.room_types,
  existing.min_room_area_sqm,
  existing.price_tier,
  1,
  0
);

console.log("Added French Sonoma Oak variant:", newId);
