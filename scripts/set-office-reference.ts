import db from "../src/lib/db";

const VISUALIZATION_URL = "/uploads/viz-minimalist-office-reference.jpg";

db.prepare(
  "UPDATE design_projects SET visualization_url = ?, status = 'completed', updated_at = datetime('now') WHERE style_slug = ? AND room_type = ?"
).run(VISUALIZATION_URL, "minimalist", "office");

console.log("Updated all minimalist office designs to use", VISUALIZATION_URL);
