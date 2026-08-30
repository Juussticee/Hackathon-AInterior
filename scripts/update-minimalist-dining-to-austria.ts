import fs from "fs";
import path from "path";
import db from "../src/lib/db";

const referenceSrcPath = "C:\\Users\\Ayaoc\\Downloads\\WhatsApp Image 2026-08-30 at 18.51.12.jpeg";
const outFile = "viz-minimalist-dining_room-reference.jpg";
const outPath = path.join(process.cwd(), "public", "uploads", outFile);
const VISUALIZATION_URL = `/uploads/${outFile}`;

if (!fs.existsSync(referenceSrcPath)) {
  console.error("Reference image not found:", referenceSrcPath);
  process.exit(1);
}

fs.copyFileSync(referenceSrcPath, outPath);
console.log("Saved reference image:", outPath);

const diningSet = db
  .prepare("SELECT * FROM products WHERE sku = ?")
  .get("811600200328") as Record<string, unknown> | undefined;
const buffet = db
  .prepare("SELECT * FROM products WHERE sku = ?")
  .get("811601100178") as Record<string, unknown> | undefined;

if (!diningSet || !buffet) {
  console.error("Austria products not found in database");
  process.exit(1);
}

console.log("Austria dining set:", diningSet.id, diningSet.name);
console.log("Austria buffet:", buffet.id, buffet.name);

const selected = [
  {
    productId: diningSet.id,
    reason:
      "Ceramic-topped oval dining table with eight fabric-upholstered chairs in natural walnut and beige, forming a refined minimalist dining centerpiece.",
    category: "dining-table",
  },
  {
    productId: buffet.id,
    reason:
      "Natural walnut buffet cabinet with ceramic details, offering storage and a clean sideboard surface that complements the Austria dining set.",
    category: "sideboard",
  },
];

const total = Number(diningSet.price_aed) + Number(buffet.price_aed);
const explanation =
  "Your minimalist dining room centers on the Austria 8-seater dining set, where a ceramic-topped oval table and fabric-upholstered chairs in natural walnut and beige create a calm, refined gathering space. " +
  "The matching Austria buffet cabinet adds generous storage and a clean sideboard surface, keeping the room uncluttered and harmonious.";

// Update all existing minimalist dining room designs to use the Austria products and reference image
const result = db
  .prepare(
    `UPDATE design_projects
     SET visualization_url = ?, selected_products = ?, total_cost_aed = ?, design_explanation = ?, status = 'completed', updated_at = datetime('now')
     WHERE style_slug = ? AND room_type = ?`
  )
  .run(
    VISUALIZATION_URL,
    JSON.stringify(selected),
    total,
    explanation,
    "minimalist",
    "dining_room"
  );

console.log(`Updated ${result.changes} minimalist dining room design(s)`);
console.log("Reference:", VISUALIZATION_URL);
console.log("Products:", selected.length);
console.log("Total cost: AED", total);
