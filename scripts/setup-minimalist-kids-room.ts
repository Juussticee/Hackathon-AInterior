import fs from "fs";
import path from "path";
import db from "../src/lib/db";
import { generateId } from "../src/lib/utils";

const companyId = "fdf89bc7-aba7-4c76-8ff0-219fef2291e3"; // Danube Home

const rugId = generateId();
const dresserId = generateId();
const bedId = generateId();
const wardrobeId = generateId();

const insertProduct = db.prepare(
  `INSERT INTO products (
    id, company_id, sku, name, category, subcategory,
    price_aed, original_price_aed, currency, product_url, affiliate_url,
    main_image_url, gallery_urls, length_cm, width_cm, height_cm,
    materials, colors, description, style_tags, room_types,
    min_room_area_sqm, price_tier, is_available, is_featured,
    created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
);

insertProduct.run(
  rugId,
  companyId,
  "231200400401",
  "Plain Plush Solid Soft Fur Rug 160x230 - Cream",
  "furniture",
  "rugs",
  249,
  499,
  "AED",
  "https://www.danubehome.com/ae/en/p/plain-plush-faux-rabbit-fur-160x230-1000gsm-25mmph-1650gsm-antislip-dotted-backing-cream01-231200400401",
  null,
  "https://assets.danubehome.com/media/dh-seller/p/231200400401/231200400401-sp-2.jpg",
  "[]",
  230,
  160,
  2.5,
  "Polyester",
  '["Cream"]',
  "A supersoft faux-fur rug that is rich and luxurious, adding sensual delight to bedroom and living room decor.",
  '["minimalist","kids","rug","cream","soft","cozy"]',
  '["kids_room","bedroom","living_room"]',
  4,
  "economy",
  1,
  0
);

insertProduct.run(
  dresserId,
  companyId,
  "810201700005",
  "Kinder 3 Drawer Dresser - White & Sonoma Oak",
  "furniture",
  "storage",
  299,
  425,
  "AED",
  "https://www.danubehome.com/ae/en/p/kinder-3-drawers-dresser-white-and-sonoma-oak-810201700005",
  null,
  "https://assets.danubehome.com/media/dh-seller/p/810201700005/810201700005-sp-ai-LF-jan-12-1.jpg",
  "[]",
  80,
  38,
  72,
  "Engineered Wood, Foil Lamination",
  '["White","Sonoma Oak"]',
  "A 3-drawer bedroom dresser made of engineered wood with foil lamination, featuring a white frame and Sonoma oak accents. Includes a 2-year warranty.",
  '["minimalist","kids","dresser","storage","white","sonoma-oak"]',
  '["kids_room","bedroom"]',
  5,
  "economy",
  1,
  0
);

insertProduct.run(
  bedId,
  companyId,
  "813300100165",
  "Reena 120x200 Upholstered Single Bed - Beige",
  "furniture",
  "beds",
  1085,
  1560,
  "AED",
  "https://www.danubehome.com/ae/en/p/reena-120-x-200-upholesterd-single-bed-beige-813300100165",
  null,
  "https://assets.danubehome.com/media/dh-seller/p/813300100165/813300100165_1780395011362_ai_0.jpeg",
  "[]",
  212.6,
  128.6,
  105,
  "Engineered Wood, Fabric, Metal",
  '["Beige"]',
  "A single-size, non-storage upholstered fabric bed with a board-panel base. Made in Turkey. Mattress sold separately.",
  '["minimalist","kids","bed","single","beige","upholstered"]',
  '["kids_room","bedroom"]',
  6,
  "moderate",
  1,
  1
);

insertProduct.run(
  wardrobeId,
  companyId,
  "813300300011",
  "Gordion 3 Door Wardrobe - Light Cream",
  "furniture",
  "storage",
  1599,
  3289,
  "AED",
  "https://www.danubehome.com/ae/en/p/gordion-3-door-wardrobe-light-cream-813300300011",
  null,
  "https://assets.danubehome.com/media/dh-seller/p/813300300011/813300300011-1a.jpg",
  "[]",
  149,
  60,
  220,
  "Wood",
  '["Cream"]',
  "A wooden three-door wardrobe with a light cream finish, adjustable shelves, and an integrated door mirror. Designed to blend seamlessly into any modern lifestyle while providing ample storage.",
  '["minimalist","kids","wardrobe","storage","cream","mirror"]',
  '["kids_room","bedroom"]',
  7,
  "moderate",
  1,
  0
);

console.log("Added products:");
console.log("- Rug:", rugId);
console.log("- Dresser:", dresserId);
console.log("- Bed:", bedId);
console.log("- Wardrobe:", wardrobeId);

const selected = [
  {
    productId: bedId,
    reason:
      "Beige upholstered single bed with a soft, padded headboard and neutral tone, creating a calm and cozy centerpiece for a minimalist kids room.",
    category: "bed",
  },
  {
    productId: wardrobeId,
    reason:
      "Light cream three-door wardrobe with mirror and adjustable shelves, offering generous clothing storage while keeping the room looking airy and uncluttered.",
    category: "storage",
  },
  {
    productId: dresserId,
    reason:
      "White and Sonoma Oak 3-drawer dresser, adding warm natural texture and compact storage for toys and clothing.",
    category: "storage",
  },
  {
    productId: rugId,
    reason:
      "Cream plush faux-fur rug that softens the floor and adds a cozy, tactile layer underfoot.",
    category: "rug",
  },
];

const total = 249 + 299 + 1085 + 1599;
const explanation =
  "Your minimalist kids room is built around a calm, neutral palette of cream, beige, white, and Sonoma oak. " +
  "The beige Reena upholstered single bed provides a soft, inviting focal point, while the light cream Gordion wardrobe and the white-and-oak Kinder dresser keep clothing and toys neatly stored. " +
  "A plush cream rug underfoot adds warmth and comfort, making the space feel safe, serene, and easy to tidy.";

// Copy user-uploaded image as static reference visualization
const srcPath = "C:\\Users\\Ayaoc\\Downloads\\WhatsApp Image 2026-08-30 at 20.58.33.jpeg";
const referenceFile = "viz-minimalist-kids_room-reference.jpg";
const referencePath = path.join(process.cwd(), "public", "uploads", referenceFile);
const referenceUrl = `/uploads/${referenceFile}`;

if (!fs.existsSync(srcPath)) {
  console.error("Source image not found:", srcPath);
  process.exit(1);
}

fs.copyFileSync(srcPath, referencePath);
console.log("Saved reference image:", referencePath);

// Update all existing minimalist kids room designs
const result = db
  .prepare(
    `UPDATE design_projects
     SET visualization_url = ?, selected_products = ?, total_cost_aed = ?, design_explanation = ?, status = 'completed', updated_at = datetime('now')
     WHERE style_slug = ? AND room_type = ?`
  )
  .run(referenceUrl, JSON.stringify(selected), total, explanation, "minimalist", "kids_room");

console.log(`Updated ${result.changes} minimalist kids room design(s)`);
console.log("Reference:", referenceUrl);
console.log("Products:", selected.length);
console.log("Total cost: AED", total);
