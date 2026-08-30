import db from "../src/lib/db";
import { generateId } from "../src/lib/utils";
import { runDesignPipeline } from "../src/lib/ai-engine";

const projectId = generateId();

// Create a test project
const userId = "37f41b46-709a-442b-bfc3-992a02fe3598"; // admin user

db.prepare(
  `INSERT INTO design_projects (
    id, user_id, title, room_type, room_length_cm, room_width_cm, room_height_cm,
    existing_furniture, additional_requirements, style_slug, budget_aed, budget_tier,
    status, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
).run(
  projectId,
  userId,
  "Test Design",
  "living_room",
  500,
  400,
  280,
  null,
  null,
  "minimalist",
  8000,
  "moderate",
  "draft"
);

console.log("Created test project:", projectId);

async function main() {
  try {
    const result = await runDesignPipeline({
      projectId,
      roomImageUrl: null,
      roomType: "living_room",
      dimensions: { length: 500, width: 400, height: 280 },
      styleSlug: "minimalist",
      budgetAed: 8000,
      additionalRequirements: null,
    });
    console.log("Pipeline succeeded");
    console.log("Total cost:", result.totalCostAed);
    console.log("Visualization:", result.visualizationUrl);
    console.log("Products:", result.selectedProducts.length);
  } catch (err) {
    console.error("Pipeline failed:", err);
  }
}

main();
