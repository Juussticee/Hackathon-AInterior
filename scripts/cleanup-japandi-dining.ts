import db from "../src/lib/db";

const projectId = "df399601-a1cd-4e4b-ab82-5c26e8fd220e";

const davionId = "ad20a7f7-de9f-416a-8314-b0811787dda6";
const diningSetId = "d82c1266-8849-46cd-a1d1-cbc2e0782392";
const buffetId = "d9991497-bc2f-417a-bb3b-99e6a6b22268";

const project = db
  .prepare("SELECT * FROM design_projects WHERE id = ?")
  .get(projectId) as Record<string, unknown> | undefined;

if (!project) {
  console.error("Japandi dining room project not found");
  process.exit(1);
}

// Build a clean selection
const selected = [
  {
    productId: davionId,
    reason:
      "Central round dining table with an organic, sculptural shape in soft white, perfect for intimate Japandi dining.",
    category: "dining-table",
  },
  {
    productId: diningSetId,
    reason:
      "Complete 6-seater dining set in natural wood and white tones, providing matching chairs and a refined rectangular table for larger gatherings.",
    category: "chairs",
  },
  {
    productId: buffetId,
    reason:
      "Marble-top buffet in white and natural oak, offering storage and a refined sideboard surface that complements the Japandi aesthetic.",
    category: "sideboard",
  },
];

// Recalculate total from current product prices
let total = 0;
for (const s of selected) {
  const product = db
    .prepare("SELECT price_aed FROM products WHERE id = ?")
    .get(s.productId) as { price_aed: number } | undefined;
  if (product) total += product.price_aed;
}

const explanation =
  "Your Japandi dining room is designed around a calm, intentional pairing of natural wood tones and soft white finishes. " +
  "The Davion round table anchors the space with its organic minimalist form, while the Modern 6-seater dining set adds flexible seating and a refined rectangular table for everyday meals and entertaining. " +
  "The Karrisa marble-top buffet provides generous storage and a clean sideboard surface, tying the room together with quiet sophistication.";

db.prepare(
  `UPDATE design_projects
   SET selected_products = ?, total_cost_aed = ?, design_explanation = ?, updated_at = datetime('now')
   WHERE id = ?`
).run(JSON.stringify(selected), total, explanation, projectId);

console.log("Cleaned up Japandi dining room project:", projectId);
console.log("New item count:", selected.length);
console.log("New total cost: AED", total);
