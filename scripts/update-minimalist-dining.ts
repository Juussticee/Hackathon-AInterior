import db from "../src/lib/db";
import { generateId } from "../src/lib/utils";

const companyId = "fdf89bc7-aba7-4c76-8ff0-219fef2291e3"; // Danube Home

// Product 1: Austria 1 + 8-Seater Dining Set
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
  "811600200328",
  "Austria 1 + 8-Seater Dining Set - Natural Walnut/Beige",
  "furniture",
  "dining-tables",
  6445,
  8709,
  "AED",
  "https://www.danubehome.com/ae/en/p/austria-1-+-8-dining-set-natural-walnut-811600200328",
  null,
  "https://assets.danubehome.com/media/dh-seller/p/811600200328/811600200328-1.jpg",
  '[]',
  240,
  100,
  75,
  "Ceramic top, fabric upholstery, wood legs, stainless steel + wood base",
  '["Natural Walnut","Beige"]',
  "Indoor dining set with a ceramic-topped oval table and eight fabric-upholstered chairs, blending wood, metal and ceramic in natural walnut and beige tones. 9-piece set with 2-year warranty.",
  '["minimalist","japandi","dining-set","8-seater","ceramic-top","natural-walnut","beige"]',
  '["dining_room"]',
  12,
  "premium",
  1,
  0
);

// Product 2: Austria Buffet Cabinet
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
  "811601100178",
  "Austria Buffet Cabinet - Natural Walnut",
  "furniture",
  "sideboards",
  2219,
  2995,
  "AED",
  "https://www.danubehome.com/ae/en/p/austria-buffet-cabinet-natural-walnut-811601100178",
  null,
  "https://assets.danubehome.com/media/dh-seller/p/811601100178/811601100178-spinfo-1.jpg",
  '[]',
  160,
  42,
  78,
  "Wood, ceramic, stainless steel",
  '["Natural Walnut"]',
  "Elegant buffet cabinet crafted from high-quality wood and ceramic. Features two closed cabinets and three spacious drawers for versatile storage. Rich natural walnut shade complements modern to classic dining spaces.",
  '["minimalist","japandi","sideboard","buffet","ceramic","natural-walnut","storage"]',
  '["dining_room","living_room"]',
  12,
  "premium",
  1,
  0
);

console.log("Added Austria 1+8 Dining Set:", diningSetId);
console.log("Added Austria Buffet Cabinet:", buffetId);

// Find the most recent minimalist dining room project with the reference image
const project = db
  .prepare(
    "SELECT * FROM design_projects WHERE style_slug = ? AND room_type = ? AND visualization_url = ? ORDER BY created_at DESC LIMIT 1"
  )
  .get("minimalist", "dining_room", "/uploads/viz-minimalist-dining_room-reference.jpg") as Record<string, unknown> | undefined;

if (!project) {
  console.error("Minimalist dining room project not found");
  process.exit(1);
}

// Replace selected products with the two new Austria pieces
const selected = [
  {
    productId: diningSetId,
    reason:
      "Ceramic-topped oval dining table with eight fabric-upholstered chairs in natural walnut and beige, forming a refined minimalist dining centerpiece.",
    category: "dining-table",
  },
  {
    productId: buffetId,
    reason:
      "Natural walnut buffet cabinet with ceramic details, offering storage and a clean sideboard surface that complements the Austria dining set.",
    category: "sideboard",
  },
];

const total = 6445 + 2219;

const explanation =
  "Your minimalist dining room centers on the Austria 8-seater dining set, where a ceramic-topped oval table and fabric-upholstered chairs in natural walnut and beige create a calm, refined gathering space. " +
  "The matching Austria buffet cabinet adds generous storage and a clean sideboard surface, keeping the room uncluttered and harmonious.";

db.prepare(
  `UPDATE design_projects
   SET selected_products = ?, total_cost_aed = ?, design_explanation = ?, updated_at = datetime('now')
   WHERE id = ?`
).run(JSON.stringify(selected), total, explanation, project.id as string);

console.log("Updated minimalist dining room project:", project.id);
console.log("New item count:", selected.length);
console.log("New total cost: AED", total);
