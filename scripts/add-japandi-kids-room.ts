import db from "../src/lib/db";
import { generateId } from "../src/lib/utils";
import { generateVisualization } from "../src/lib/ai-engine";
import type { Product, SpaceAnalysis } from "../src/lib/types";
import path from "path";

const companyId = "fdf89bc7-aba7-4c76-8ff0-219fef2291e3"; // Danube Home

// Insert products
const wardrobeId = generateId();
const bedId = generateId();
const dressingTableId = generateId();

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
  wardrobeId,
  companyId,
  "810200600075",
  "Calino 2 Door Wardrobe - Sonoma Oak & Light Oak",
  "furniture",
  "storage",
  399,
  545,
  "AED",
  "https://www.danubehome.com/ae/en/p/calino-2-door-wardrobe-sonoma-oak-and-light-oak-810200600075",
  null,
  "https://assets.danubehome.com/media/dh-seller/p/810200600075/810200600075-1.jpg",
  "[]",
  80,
  47.5,
  183,
  "Engineered Wood, 3D Foil Lamination",
  '["Sonoma Oak","Light Oak"]',
  "Two-door kids' wardrobe from the Calino collection, offered in a Sonoma Oak and Light Oak finish with free installation.",
  '["japandi","minimalist","kids","wardrobe","storage","sonoma-oak","light-oak"]',
  '["kids_room","bedroom"]',
  6,
  "economy",
  1,
  0
);

insertProduct.run(
  bedId,
  companyId,
  "179900157124",
  "Protective Upholstered Bed Frame with Side Guards and Headboard - Off-White Velvet - Queen Size 160x200",
  "furniture",
  "beds",
  3599,
  3999,
  "AED",
  "https://www.danubehome.com/ae/en/p/protective-upholstered-bed-frame-with-side-guards-and-headboard-modern-enclosed-kids-children-family-bed-solid-wood-velvet-off-white-queen-size-160x200-179900157124",
  null,
  "https://assets.danubehome.com/media/dh-seller/p/sellers/NOOK-MAISON/product-image/179900157124/1777976619478/0.webp",
  "[]",
  230,
  180,
  75,
  "Solid Wood, MDF, Velvet Fabric",
  '["Off-White","Cream","Beige"]',
  "An enclosed queen-size bed with padded side guards and a cushioned headboard, built from solid wood and MDF and covered in velvet. Designed for child safety, it includes side storage pockets and a plush headboard for lounging. Mattress not included.",
  '["japandi","minimalist","kids","bed","queen","velvet","off-white","enclosed"]',
  '["kids_room","bedroom"]',
  8,
  "premium",
  1,
  1
);

insertProduct.run(
  dressingTableId,
  companyId,
  "179900076426",
  "Dressing Table with Mirror and Chair",
  "furniture",
  "desks",
  2749,
  3079,
  "AED",
  "https://www.danubehome.com/ae/en/p/awd-dressing-table-with-mirror-and-chair-179900076426",
  null,
  "https://assets.danubehome.com/media/dh-seller/p/sellers/AWD-STORE/product-image/179900076426/1708845504818/0.jpeg",
  "[]",
  120,
  40,
  75,
  "Solid Wood, Wood, Metal",
  '["White"]',
  "White vanity dressing table set with a lit mirror, storage drawers, and chair. Features solid wood construction, metal legs, and free installation.",
  '["japandi","minimalist","kids","dressing-table","vanity","desk","white"]',
  '["kids_room","bedroom"]',
  6,
  "premium",
  1,
  0
);

console.log("Added products:");
console.log("- Wardrobe:", wardrobeId);
console.log("- Bed:", bedId);
console.log("- Dressing table:", dressingTableId);

// Build curated selection
const selected = [
  {
    productId: bedId,
    reason:
      "Enclosed queen-size kids bed with padded side guards and cushioned headboard in off-white velvet, providing safety and comfort for a Japandi kids room.",
    category: "bed",
  },
  {
    productId: wardrobeId,
    reason:
      "Compact two-door wardrobe in Sonoma Oak and Light Oak, offering practical clothing storage with warm natural tones.",
    category: "storage",
  },
  {
    productId: dressingTableId,
    reason:
      "White dressing table with mirror and chair, doubling as a study or vanity desk with soft Japandi-compatible tones.",
    category: "desk",
  },
];

const total = 399 + 3599 + 2749;
const explanation =
  "This Japandi kids room balances safety, warmth, and calm simplicity. The enclosed velvet bed with protective side guards creates a cozy, secure sleep space, while the Sonoma Oak wardrobe and white dressing table add natural texture and practical storage. The palette of off-white, cream, and light oak keeps the room serene and uncluttered.";

// Generate reference visualization
const spaceAnalysis: SpaceAnalysis = {
  roomType: "kids_room",
  estimatedAreaSqm: 7.5,
  shape: "rectangular",
  walls: [
    { id: "w1", lengthM: 3, hasWindow: true, hasDoor: false },
    { id: "w2", lengthM: 2.5, hasWindow: false, hasDoor: true },
    { id: "w3", lengthM: 3, hasWindow: false, hasDoor: false },
    { id: "w4", lengthM: 2.5, hasWindow: false, hasDoor: false },
  ],
  existingFurniture: [],
  floorType: "hardwood",
  lighting: "natural-good",
  availableWallSpaceSqm: 10,
  constraints: [],
};

async function main() {
  const enriched = selected.map((sp) => {
    const product = db.prepare("SELECT * FROM products WHERE id = ?").get(sp.productId) as Product;
    return { ...sp, product };
  });

  const visualizationUrl = await generateVisualization(spaceAnalysis, enriched, "japandi");
  if (!visualizationUrl) {
    console.error("Failed to generate visualization");
    process.exit(1);
  }

  // Copy generated visualization to reference path
  const fs = await import("fs");
  const generatedPath = path.join(process.cwd(), "public", visualizationUrl);
  const referenceFile = "viz-japandi-kids_room-reference.jpg";
  const referencePath = path.join(process.cwd(), "public", "uploads", referenceFile);
  const referenceUrl = `/uploads/${referenceFile}`;

  fs.copyFileSync(generatedPath, referencePath);
  console.log("Saved reference image:", referencePath);

  // Update all existing japandi kids room designs
  const result = db
    .prepare(
      `UPDATE design_projects
       SET visualization_url = ?, selected_products = ?, total_cost_aed = ?, design_explanation = ?, status = 'completed', updated_at = datetime('now')
       WHERE style_slug = ? AND room_type = ?`
    )
    .run(referenceUrl, JSON.stringify(selected), total, explanation, "japandi", "kids_room");

  console.log(`Updated ${result.changes} japandi kids room design(s)`);
  console.log("Reference:", referenceUrl);
  console.log("Total cost: AED", total);
}

main();
