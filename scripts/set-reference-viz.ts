import db from "../src/lib/db";

const PROJECT_ID = "aef8d4d2-d287-4bad-a72a-43e4293ec8b7";
const VISUALIZATION_URL = "/uploads/viz-minimalist-living_room-reference.jpg";

db.prepare(
  "UPDATE design_projects SET visualization_url = ?, status = 'completed', updated_at = datetime('now') WHERE id = ?"
).run(VISUALIZATION_URL, PROJECT_ID);

console.log("Updated visualization_url to", VISUALIZATION_URL);
