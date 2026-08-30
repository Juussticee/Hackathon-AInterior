import db from "../src/lib/db";
import { generateId } from "../src/lib/utils";

const companyId = "fdf89bc7-aba7-4c76-8ff0-219fef2291e3"; // Danube Home

// Product 1: Modern 6-Seater Dining Table Set
const diningSetId = generateId();
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
  diningSetId,
  companyId,
  "179900151745",
  "Modern 6-Seater Dining Table Set - Elegant Design",
  "furniture",
  "dining-tables",
  6049,
  null,
  "AED",
  "https://www.danubehome.com/ae/en/p/modern-6-seater-dining-table-set-elegant-design-179900151745",
  null,
  "https://assets.danubehome.com/media/dh-seller/p/sellers/AWD-STORE/product-image/179900151745/1767790354348/0.jpeg",
  '[]',
  180,
  90,
  75,
  "Solid Wood, MDF, fabric upholstery",
  '["White","Light Brown"]',
  "Rectangular modern dining set with natural wood finish, sturdy wooden legs, and six fabric-upholstered chairs with curved back support. 7-piece set suitable for dining rooms and open kitchens.",
  '["japandi","minimalist","dining-set","6-seater","natural-wood","white","contemporary"]',
  '["dining_room"]',
  10,
  "premium",
  1,
  0
);

// Product 2: Karrisa Marble Top Buffet
const buffetId = generateId();
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
  buffetId,
  companyId,
  "811600100358",
  "Karrisa Marble Top Buffet with 3 Drawers and 3 Doors - White/Natural Oak",
  "furniture",
  "sideboards",
  1999,
  3429,
  "AED",
  "https://www.danubehome.com/ae/en/p/karrisa-marble-top-buffet-with-3-drawers-and-3-doors-white-natural-oak-811600100358",
  null,
  "https://assets.danubehome.com/media/dh-seller/p/811600100358/811600100358-1.jpg",
  '[]',
  163.58,
  48.26,
  97.79,
  "Marble top, solid wood base",
  '["White","Natural Oak"]',
  "Buffet table with marble top, solid wood base, three drawers and three doors for storage. Finished in white and natural oak tones with masterful craftsmanship and timeless elegance.",
  '["japandi","minimalist","sideboard","buffet","marble-top","white-and-oak","storage"]',
  '["dining_room","living_room"]',
  10,
  "premium",
  1,
  0
);

console.log("Added Modern 6-Seater Dining Set:", diningSetId);
console.log("Added Karrisa Marble Top Buffet:", buffetId);

// Add both to the existing Japandi dining room project
const project = db
  .prepare("SELECT * FROM design_projects WHERE style_slug = ? AND room_type = ?")
  .get("japandi", "dining_room") as Record<string, unknown> | undefined;

if (!project) {
  console.error("No Japandi dining room project found");
  process.exit(1);
}

let selected: { productId: string; reason: string; category: string }[] = [];
try {
  selected = JSON.parse((project.selected_products as string) || "[]");
} catch {
  selected = [];
}

// Avoid duplicates
if (!selected.some((s) => s.productId === diningSetId)) {
  selected.push({
    productId: diningSetId,
    reason:
      "Complete 6-seater dining set in natural wood and white tones, providing a central dining table and matching chairs for the Japandi dining room.",
    category: "dining-table",
  });
}

if (!selected.some((s) => s.productId === buffetId)) {
  selected.push({
    productId: buffetId,
    reason:
      "Marble-top buffet in white and natural oak, offering storage and a refined sideboard surface that complements the Japandi aesthetic.",
    category: "sideboard",
  });
}

// Recalculate total from current product prices
let total = 0;
for (const s of selected) {
  const product = db
    .prepare("SELECT price_aed FROM products WHERE id = ?")
    .get(s.productId) as { price_aed: number } | undefined;
  if (product) total += product.price_aed;
}

db.prepare(
  `UPDATE design_projects
   SET selected_products = ?, total_cost_aed = ?, updated_at = datetime('now')
   WHERE id = ?`
).run(JSON.stringify(selected), total, project.id as string);

console.log("Updated Japandi dining room project:", project.id);
console.log("New item count:", selected.length);
console.log("New total cost: AED", total);
