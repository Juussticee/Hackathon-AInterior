import db from "../src/lib/db";

const projectId = "df399601-a1cd-4e4b-ab82-5c26e8fd220e";
const davionId = "ad20a7f7-de9f-416a-8314-b0811787dda6";

const project = db
  .prepare("SELECT * FROM design_projects WHERE id = ?")
  .get(projectId) as Record<string, unknown> | undefined;

if (!project) {
  console.error("Japandi dining room project not found");
  process.exit(1);
}

let selected: { productId: string; reason: string; category: string }[] = [];
try {
  selected = JSON.parse((project.selected_products as string) || "[]");
} catch {
  selected = [];
}

const filtered = selected.filter((s) => s.productId !== davionId);

if (filtered.length === selected.length) {
  console.log("Davion table not found in project");
  process.exit(0);
}

// Recalculate total
let total = 0;
for (const s of filtered) {
  const product = db
    .prepare("SELECT price_aed FROM products WHERE id = ?")
    .get(s.productId) as { price_aed: number } | undefined;
  if (product) total += product.price_aed;
}

const explanation =
  "Your Japandi dining room centers on the Modern 6-seater dining set in natural wood and white tones, offering a refined rectangular table and matching chairs for everyday meals and entertaining. " +
  "The Karrisa marble-top buffet in white and natural oak provides generous storage and a clean sideboard surface, tying the room together with quiet sophistication.";

db.prepare(
  `UPDATE design_projects
   SET selected_products = ?, total_cost_aed = ?, design_explanation = ?, updated_at = datetime('now')
   WHERE id = ?`
).run(JSON.stringify(filtered), total, explanation, projectId);

console.log("Removed Davion table from Japandi dining room project:", projectId);
console.log("New item count:", filtered.length);
console.log("New total cost: AED", total);
