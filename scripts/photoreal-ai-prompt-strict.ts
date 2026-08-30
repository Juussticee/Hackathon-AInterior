import db from "../src/lib/db";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";

const PROJECT_ID = "aef8d4d2-d287-4bad-a72a-43e4293ec8b7";

async function main() {
  const project = db
    .prepare("SELECT * FROM design_projects WHERE id = ?")
    .get(PROJECT_ID) as Record<string, unknown> | undefined;
  if (!project) throw new Error("Project not found");

  const styleSlug = project.style_slug as string;
  const roomType = project.room_type as string;
  const length = project.room_length_cm as number;
  const width = project.room_width_cm as number;
  const selected = JSON.parse((project.selected_products as string) || "[]") as Array<{
    productId: string;
    reason: string;
    category: string;
  }>;

  const enriched = selected
    .map((sp) => {
      const product = db.prepare("SELECT * FROM products WHERE id = ?").get(sp.productId) as
        | Record<string, unknown>
        | undefined;
      return product ? { ...sp, product } : null;
    })
    .filter(Boolean) as Array<{
    productId: string;
    reason: string;
    category: string;
    product: Record<string, unknown>;
  }>;

  const productSpecs = enriched
    .map((sp) => {
      const p = sp.product;
      const dims: string[] = [];
      if (p.length_cm) dims.push(`${p.length_cm}cm long`);
      if (p.width_cm) dims.push(`${p.width_cm}cm wide`);
      if (p.height_cm) dims.push(`${p.height_cm}cm high`);
      const dimText = dims.length ? ` (${dims.join(" x ")})` : "";
      return `${p.name as string}${dimText}: ${p.description as string}`;
    })
    .join("; ");

  const lengthM = (length / 100).toFixed(1);
  const widthM = (width / 100).toFixed(1);

  const prompt = [
    `Interior design magazine photograph, ${styleSlug} living room, 4.5m x 3.5m, eye-level straight-on view.`,
    `CRITICAL: all furniture must match these exact products and colors: ${productSpecs}.`,
    `The sofa set MUST be grey fabric, not white or beige.`,
    `The rug MUST be dark grey, 200x300cm, under the coffee table and sofa.`,
    `The TV unit MUST be off-white and almond colored, extendable, low and long, against the right wall.`,
    `The coffee table MUST be white and grey two-tone with a drawer, centered in front of the sofa.`,
    `The pendant light MUST be smoke grey glass, hanging from the ceiling center.`,
    `A gold metal floor lamp with glass shade MUST stand in the back-left corner.`,
    `A small globe table lamp MUST sit on the TV unit.`,
    `Room: bright white walls, warm light oak herringbone floor, large centered window with sheer white curtains, soft natural daylight.`,
    `Photorealistic 8K, no people, no text, no extra plants, no ceiling light fixture other than the smoke grey pendant.`
  ].join(" ");

  const encoded = encodeURIComponent(prompt);
  const seed = (Date.now() % 99999) + 1;
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=1344&height=756&seed=${seed}&nologo=true&enhance=false&model=flux`;

  console.log("[pollinations] Requesting strict photorealistic image…");
  const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`Pollinations failed: ${res.status}`);

  const sharpMod = require("sharp");
  const sharp = (sharpMod.default || sharpMod) as (input: Buffer | string) => import("sharp").Sharp;

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 10000) throw new Error("Image too small");
  const jpegBuf = await sharp(buf).jpeg({ quality: 92 }).toBuffer();

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
  const filename = `viz-${Date.now()}-ai-photo.jpg`;
  writeFileSync(path.join(uploadsDir, filename), jpegBuf);

  const visualizationUrl = `/uploads/${filename}`;
  db.prepare(
    "UPDATE design_projects SET visualization_url = ?, status = 'completed', updated_at = datetime('now') WHERE id = ?"
  ).run(visualizationUrl, PROJECT_ID);

  console.log("[done] Saved and updated:", visualizationUrl, `(${(jpegBuf.length / 1024).toFixed(0)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
