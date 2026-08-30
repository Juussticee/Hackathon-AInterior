import fs from "fs";
import path from "path";
import db from "../src/lib/db";

const srcPath = "C:\\Users\\Ayaoc\\Downloads\\WhatsApp Image 2026-08-30 at 20.26.42 (1).jpeg";
const outFile = "viz-japandi-kids_room-reference.jpg";
const outPath = path.join(process.cwd(), "public", "uploads", outFile);
const VISUALIZATION_URL = `/uploads/${outFile}`;

if (!fs.existsSync(srcPath)) {
  console.error("Source image not found:", srcPath);
  process.exit(1);
}

fs.copyFileSync(srcPath, outPath);
console.log("Saved reference image:", outPath);

const result = db
  .prepare(
    "UPDATE design_projects SET visualization_url = ?, status = 'completed', updated_at = datetime('now') WHERE style_slug = ? AND room_type = ?"
  )
  .run(VISUALIZATION_URL, "japandi", "kids_room");

console.log(`Updated ${result.changes} japandi kids room design(s) to use`, VISUALIZATION_URL);
