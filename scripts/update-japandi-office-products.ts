import db from "../src/lib/db";

const projectId = "f07bd349-780d-46a0-8159-9e84f11923b3";

const removeIds = [
  "d640a2e8-31f3-4430-9d73-3ceb26b40a9a", // Gracyn Study Desk - Ash White/Oak
  "b1fc415c-6678-4c8e-8630-fbbefed0fbc2", // Haslem Writing Desk - Grey/Beige
];

const chairId = "ac8618b8-14cc-486b-bebb-1b1af18d80c8"; // Jeffcoco Wooden Leg Leather Cushion Seat Chair - White

const project = db
  .prepare("SELECT * FROM design_projects WHERE id = ?")
  .get(projectId) as Record<string, unknown> | undefined;

if (!project) {
  console.error("Japandi office project not found");
  process.exit(1);
}

let selected: { productId: string; reason: string; category: string }[] = [];
try {
  selected = JSON.parse((project.selected_products as string) || "[]");
} catch {
  selected = [];
}

// Remove the two desks
const filtered = selected.filter((s) => !removeIds.includes(s.productId));

if (filtered.length === selected.length) {
  console.log("No desks were removed (already absent?)");
}

// Add Jeffcoco chair if not already present
if (!filtered.some((s) => s.productId === chairId)) {
  filtered.push({
    productId: chairId,
    reason:
      "White leather-cushion chair with warm wooden legs, adding comfort and a clean Japandi accent to the workspace.",
    category: "chair",
  });
}

// Recalculate total from current product prices
let total = 0;
for (const s of filtered) {
  const product = db
    .prepare("SELECT price_aed FROM products WHERE id = ?")
    .get(s.productId) as { price_aed: number } | undefined;
  if (product) total += product.price_aed;
}

db.prepare(
  `UPDATE design_projects
   SET selected_products = ?, total_cost_aed = ?, updated_at = datetime('now')
   WHERE id = ?`
).run(JSON.stringify(filtered), total, projectId);

console.log("Updated Japandi office project:", projectId);
console.log("New item count:", filtered.length);
console.log("New total cost: AED", total);
