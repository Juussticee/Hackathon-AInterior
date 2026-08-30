import fs from "fs";
import path from "path";
import db from "../src/lib/db";

const generatedViz = "/uploads/viz-1788103173689-39975.jpg";
const outFile = "viz-minimalist-dining_room-reference.jpg";
const outPath = path.join(process.cwd(), "public", "uploads", outFile);
const VISUALIZATION_URL = `/uploads/${outFile}`;

const srcPath = path.join(process.cwd(), "public", generatedViz);
if (!fs.existsSync(srcPath)) {
  console.error("Generated visualization not found:", srcPath);
  process.exit(1);
}

fs.copyFileSync(srcPath, outPath);
console.log("Saved reference image:", outPath);

const selected = [
  {
    productId: "0aba035a-d885-4aa0-8de5-b951660d4640",
    reason: "Selected to cover dining-table within budget using a dining tables piece.",
    category: "dining-table",
  },
  {
    productId: "ac8618b8-14cc-486b-bebb-1b1af18d80c8",
    reason: "Selected to cover chairs within budget using a desk chairs piece.",
    category: "chairs",
  },
  {
    productId: "d9991497-bc2f-417a-bb3b-99e6a6b22268",
    reason: "Selected to cover sideboard within budget using a sideboards piece.",
    category: "sideboard",
  },
];

const total = 2503;
const explanation =
  "Welcome to your newly envisioned dining room, where refined simplicity meets everyday warmth. Designed around a modern Minimalist aesthetic, this 14-square-meter space focuses on clean lines, purposeful functionality, and uncluttered elegance. By eliminating visual noise, we have transformed the room into a tranquil sanctuary tailored for relaxed, intimate dining and effortless entertaining.\n\n" +
  "At the heart of the design is the Agata Dining Table, whose sleek brown and black profile anchors the space with understated sophistication. Paired thoughtfully with the Jeffcoco White Leather Cushion Chairs, the seating introduces a crisp, contemporary contrast while maintaining a light visual footprint. Framing the room, the Karrisa Marble Top Buffet serves as both a breathtaking anchor piece and a functional centerpiece, seamlessly connecting the dining arrangement with its refined silhouette.\n\n" +
  "The color palette is a masterclass in modern balance, weaving together grounded dark tones, natural oak, and luminous white accents. Texture takes center stage through a harmonious blend of smooth white marble, supple leather, and warm wood grains. This subtle interplay of materials adds rich visual depth and tactile luxury, ensuring the minimalist scheme feels cozy and inviting rather than sparse.\n\n" +
  "Carefully proportioned for a 14-square-meter footprint, the layout optimizes traffic flow and preserves open floor space, allowing natural light to move freely throughout. The generous storage within the Karrisa buffet keeps daily essentials tucked away to effortlessly maintain the room's pristine look. Curated for just AED 2,503—well within your AED 5,000 budget—this concept delivers an exceptional blend of high-end design, spatial efficiency, and lasting value.";

// Update all existing minimalist dining room designs to use the reference image and curated selection
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
