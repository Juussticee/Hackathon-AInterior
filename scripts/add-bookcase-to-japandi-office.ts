import db from "../src/lib/db";

// Find the Skyland bookcase we just added
const bookcase = db
  .prepare("SELECT * FROM products WHERE sku = ?")
  .get("179900157948") as Record<string, unknown> | undefined;

if (!bookcase) {
  console.error("Skyland bookcase not found in DB");
  process.exit(1);
}

const bookcaseId = bookcase.id as string;
const bookcasePrice = bookcase.price_aed as number;

// Find the existing Japandi office project
const project = db
  .prepare("SELECT * FROM design_projects WHERE style_slug = ? AND room_type = ?")
  .get("japandi", "office") as Record<string, unknown> | undefined;

if (!project) {
  console.error("No Japandi office project found");
  process.exit(1);
}

let selected: { productId: string; reason: string; category: string }[] = [];
try {
  selected = JSON.parse((project.selected_products as string) || "[]");
} catch {
  selected = [];
}

// Avoid duplicates
if (selected.some((s) => s.productId === bookcaseId)) {
  console.log("Bookcase already in project");
  process.exit(0);
}

selected.push({
  productId: bookcaseId,
  reason:
    "Tall Sonoma Oak open bookcase providing vertical storage and display space, echoing the warm wood tones and serene Japandi aesthetic.",
  category: "storage",
});

const newTotal = (project.total_cost_aed as number) + bookcasePrice;

db.prepare(
  `UPDATE design_projects
   SET selected_products = ?, total_cost_aed = ?, updated_at = datetime('now')
   WHERE id = ?`
).run(JSON.stringify(selected), newTotal, project.id as string);

console.log("Added bookcase to Japandi office project:", project.id);
console.log("New total cost: AED", newTotal);
