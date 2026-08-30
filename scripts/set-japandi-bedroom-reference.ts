import db from "../src/lib/db";

const VISUALIZATION_URL = "/uploads/viz-japandi-bedroom-reference.jpg";

db.prepare(
  "UPDATE design_projects SET visualization_url = ?, status = 'completed', updated_at = datetime('now') WHERE style_slug = ? AND room_type = ?"
).run(VISUALIZATION_URL, "japandi", "bedroom");

console.log("Updated all japandi bedroom designs to use", VISUALIZATION_URL);
