import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

async function main() {
  const db = new Database(path.join(process.cwd(), "data", "ainterior.db"));

  const tier2 = db
    .prepare("SELECT * FROM design_projects WHERE id LIKE '815b17e2%'")
    .get() as Record<string, unknown>;

  const names = [
    "%Demaris 3-Seater Fabric Sofa%",
    "%Modern Contemporary Rug 160x230 - Brown White%",
    "%Lucia TV Unit with Extendable Top%",
    "%Seon Glass Pendant Chandelier%",
  ];
  const cats = ["sofa", "rug", "tv-unit", "lighting"];
  const reasons = [
    "The Demaris 3-seater in light brown anchors the seating area with soft fabric comfort and clean minimalist lines at an accessible price.",
    "The Galeria Lux contemporary rug in brown and white grounds the seating zone, adding geometric pattern and warmth underfoot.",
    "The Lucia TV unit with extendable top in off-white/almond provides compact media storage that keeps the wall clean and uncluttered.",
    "The Seon glass pendant chandelier in amber glass brings warm, layered light and a touch of elegance suspended over the seating.",
  ];

  const selected: { productId: string; reason: string; category: string }[] = [];
  let total = 0;
  for (let i = 0; i < names.length; i++) {
    const p = db
      .prepare("SELECT id, name, price_aed FROM products WHERE name LIKE ?")
      .get(names[i]) as { id: string; name: string; price_aed: number } | undefined;
    if (!p) {
      console.error("NOT FOUND:", names[i]);
      process.exit(1);
    }
    total += p.price_aed;
    selected.push({ productId: p.id, reason: reasons[i], category: cats[i] });
  }
  console.log("Total:", total);
  if (total > 5000) {
    console.error("Total exceeds tier-3 budget window");
    process.exit(1);
  }

  const explanation =
    "Welcome to your minimalist living room on a smart budget. The Demaris 3-seater sofa in light brown fabric sets a warm, relaxed tone, paired with the Galeria Lux geometric rug in brown and white that ties the seating area together. The Lucia TV unit with extendable top keeps your media wall clean and functional, while the Seon amber glass pendant chandelier suspended overhead adds a gentle glow and a designer touch — all for AED " +
    total.toLocaleString() +
    ".";

  const id = randomUUID();
  db.prepare(
    `INSERT INTO design_projects
      (id, user_id, room_type, room_image_url, room_length_cm, room_width_cm,
       room_height_cm, existing_furniture, additional_requirements,
       style_slug, budget_aed, budget_tier, status,
       space_analysis, selected_products, visualization_url,
       design_explanation, total_cost_aed, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
  ).run(
    id,
    tier2.user_id,
    "living_room",
    null,
    500,
    400,
    null,
    null,
    null,
    "minimalist",
    5000,
    "moderate",
    tier2.space_analysis,
    JSON.stringify(selected),
    "/uploads/viz-minimalist-living_room-reference-3.jpg",
    explanation,
    total
  );

  console.log("Inserted tier-3 project:", id);

  const check = db
    .prepare("SELECT id, total_cost_aed, visualization_url FROM design_projects WHERE id = ?")
    .get(id) as Record<string, unknown>;
  console.log("Verify:", JSON.stringify(check));

  db.pragma("wal_checkpoint(TRUNCATE)");
  db.close();

  fs.copyFileSync("data/ainterior.db", "src/data/seeded.db");
  for (const s of ["-wal", "-shm"]) {
    const p = "src/data/seeded.db" + s;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  console.log("seeded.db refreshed");
}

main();
