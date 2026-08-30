import db from "../src/lib/db";
import { generateId } from "../src/lib/utils";

const newId = generateId();

const companyId = "fdf89bc7-aba7-4c76-8ff0-219fef2291e3"; // Danube Home

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
  companyId,
  "179900157948",
  "Skyland Sonoma Oak Tall Bookcase with 5 Open Shelves and Adjustable Feet",
  "furniture",
  "storage",
  600,
  null,
  "AED",
  "https://www.danubehome.com/ae/en/p/skyland-sonoma-oak-tall-bookcase-with-5-open-shelves-and-adjustable-feet-large-freestanding-shelving-unit-8541193-cm-home-office-furniture-european-quality-179900157948",
  null,
  "https://assets.danubehome.com/media/dh-seller/p/sellers/TREEJAR-TRADING/product-image/179900157948/1780115677947/0.png",
  '[]',
  85,
  41,
  193,
  "Engineered Wood, PVC edge, laminated finish",
  '["Sonoma Oak"]',
  "Wide, tall open bookcase in warm Sonoma Oak finish. Five open shelves, 18mm laminated chipboard construction, PVC edge protection, and four adjustable floor levellers. Flat-packed for home assembly.",
  '["japandi","minimalist","storage","bookcase","sonoma-oak","home-office","open-shelves"]',
  '["office","living_room","bedroom","studio"]',
  8,
  "moderate",
  1,
  0
);

console.log("Added Skyland Sonoma Oak bookcase:", newId);
