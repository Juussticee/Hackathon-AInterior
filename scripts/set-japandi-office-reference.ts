import fs from "fs";
import path from "path";
import sharp from "sharp";
import db from "../src/lib/db";

const srcPath = "C:\\Users\\Ayaoc\\Downloads\\ChatGPT Image Aug 30, 2026, 05_59_37 PM.png";
const outFile = "viz-japandi-office-reference.jpg";
const outPath = path.join(process.cwd(), "public", "uploads", outFile);
const VISUALIZATION_URL = `/uploads/${outFile}`;

if (!fs.existsSync(srcPath)) {
  console.error("Source image not found:", srcPath);
  process.exit(1);
}

async function main() {
  // Convert PNG to JPEG and save
  await sharp(srcPath).jpeg({ quality: 92 }).toFile(outPath);
  console.log("Saved reference image:", outPath);

  // Update existing Japandi office designs to use this reference
  const result = db
    .prepare(
      "UPDATE design_projects SET visualization_url = ?, status = 'completed', updated_at = datetime('now') WHERE style_slug = ? AND room_type = ?"
    )
    .run(VISUALIZATION_URL, "japandi", "office");

  console.log(
    `Updated ${result.changes} Japandi office design(s) to use`,
    VISUALIZATION_URL
  );
}

main();
