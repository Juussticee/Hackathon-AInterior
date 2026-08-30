import db from "../src/lib/db";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

const PROJECT_ID = "aef8d4d2-d287-4bad-a72a-43e4293ec8b7";

const sharpMod = require("sharp");
const sharp = (sharpMod.default || sharpMod) as (input: Buffer | string) => import("sharp").Sharp;

/** One-point perspective: map room floor coords (cm) → canvas pixels */
function roomToScreen(
  rx: number,
  rz: number,
  roomW: number,
  roomL: number,
  floorNear: { x0: number; x1: number; y: number },
  floorFar: { x0: number; x1: number; y: number }
): { x: number; y: number } {
  const tz = Math.min(1, Math.max(0, rz / roomL));
  const y = floorNear.y + (floorFar.y - floorNear.y) * tz;
  const xl = floorNear.x0 + (floorFar.x0 - floorNear.x0) * tz;
  const xr = floorNear.x1 + (floorFar.x1 - floorNear.x1) * tz;
  const x = xl + (xr - xl) * (rx / roomW);
  return { x: Math.round(x), y: Math.round(y) };
}

function pxPerCm(tz: number, roomW: number, canvasW: number, bwSpan: number): number {
  const nearPxPerCm = canvasW / roomW;
  const farPxPerCm = bwSpan / roomW;
  return nearPxPerCm + (farPxPerCm - nearPxPerCm) * tz;
}

async function removeBg(raw: Buffer): Promise<Buffer | null> {
  try {
    const { removeBackground } = require("@imgly/background-removal-node") as {
      removeBackground: (input: Blob, opts?: Record<string, unknown>) => Promise<Blob>;
    };
    const blob = new Blob([raw as unknown as BlobPart], { type: "image/jpeg" });
    const result = await removeBackground(blob, { output: { format: "image/png" } });
    return Buffer.from(await result.arrayBuffer());
  } catch (err) {
    console.error("[bg-remove] failed:", err);
    return null;
  }
}

async function getProductCutout(productId: string, imageUrl: string): Promise<Buffer | null> {
  const uploadsDir = path.join(process.cwd(), "public", "uploads", "cutouts");
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
  const cachePath = path.join(uploadsDir, `${productId}.png`);
  if (existsSync(cachePath)) return readFileSync(cachePath);

  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const raw = Buffer.from(await res.arrayBuffer());
    const cutout = await removeBg(raw);
    if (cutout) writeFileSync(cachePath, cutout);
    return cutout;
  } catch (err) {
    console.error(`[cutout] ${productId} failed:`, err);
    return null;
  }
}

async function fetchBaseRoomFromPollinations(
  styleName: string,
  roomType: string,
  dimensions: { length: number; width: number }
): Promise<Buffer | null> {
  const lengthM = (dimensions.length / 100).toFixed(1);
  const widthM = (dimensions.width / 100).toFixed(1);
  const prompt = [
    `Photorealistic empty ${styleName.toLowerCase()} ${roomType.replace(/_/g, " ")} interior.`,
    `Front-facing eye-level camera view, one-point perspective.`,
    `Room dimensions ${lengthM}m x ${widthM}m, spacious and uncluttered.`,
    `Bright white walls, warm light oak herringbone wood floor, large floor-to-ceiling window centered on the far back wall with soft daylight and sheer white curtains.`,
    `No furniture, no decor, no people, no ceiling light fixture.`,
    `Clean architectural lines, neutral serene color palette, magazine-quality interior photography, 8K, soft natural shadows.`
  ].join(" ");

  const encoded = encodeURIComponent(prompt);
  const seed = Date.now() % 99999;
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=1344&height=756&seed=${seed}&nologo=true&enhance=false&model=flux`;

  console.log("[base-room] Requesting Pollinations empty room…");
  const res = await fetch(url, { signal: AbortSignal.timeout(90000) });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 10000) return null;
  return sharp(buf).jpeg({ quality: 92 }).toBuffer();
}

async function refineWithPollinations(
  compositePath: string,
  productLines: string,
  styleName: string,
  roomType: string
): Promise<Buffer | null> {
  // Upload local composite to a temporary public host so Pollinations can fetch it
  let publicUrl: string | null = null;
  try {
    const { execSync } = require("child_process");
    const out = execSync(`curl -s -F "file=@${compositePath}" https://0x0.st`, { timeout: 30000 });
    const url = out.toString().trim();
    publicUrl = url.startsWith("http") ? url : null;
  } catch (err) {
    console.warn("[refine] Could not upload composite:", err);
  }
  if (!publicUrl) return null;

  const prompt = [
    `Photorealistic ${styleName.toLowerCase()} ${roomType.replace(/_/g, " ")} interior.`,
    `Preserve the exact furniture layout, positions, sizes and proportions from the reference image.`,
    `Use these exact real products: ${productLines}.`,
    `Make the scene look like a high-end interior design magazine photo with natural daylight, realistic materials, soft shadows, and harmonious neutral tones.`,
    `Do not add extra furniture. Keep all listed products visible and recognizable. No people, no text, no watermarks.`
  ].join(" ");

  const encoded = encodeURIComponent(prompt);
  const seed = Date.now() % 99999;
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=1344&height=756&seed=${seed}&nologo=true&enhance=false&model=flux&image=${encodeURIComponent(publicUrl)}`;

  console.log("[refine] Requesting Pollinations img2img refinement…");
  const res = await fetch(url, { signal: AbortSignal.timeout(90000) });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 10000) return null;
  return sharp(buf).jpeg({ quality: 92 }).toBuffer();
}

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

  console.log(`[project] ${PROJECT_ID} ${styleSlug} ${roomType} ${length}x${width}cm`);

  // Enrich products
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

  // Generate empty photorealistic base room
  const baseBuf = await fetchBaseRoomFromPollinations(
    styleSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    roomType,
    { length, width }
  );
  if (!baseBuf) throw new Error("Failed to generate base room");

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

  const baseFile = `viz-${Date.now()}-base-room.jpg`;
  writeFileSync(path.join(uploadsDir, baseFile), baseBuf);
  console.log(`[base-room] Saved ${baseFile}`);

  // Canvas layout (reuse the perspective geometry from ai-engine)
  const W = 1344;
  const H = 756;
  const roomL = length;
  const roomW = width;

  const bwL = Math.round(W * 0.22);
  const bwR = Math.round(W * 0.78);
  const bwB = Math.round(H * 0.69);

  const FLOOR_FAR = { x0: bwL, x1: bwR, y: bwB };
  const FLOOR_NEAR = { x0: 0, x1: W, y: H };

  const SLOTS: [number, number][] = [
    [0.16, 0.87], [0.50, 0.87], [0.84, 0.87],
    [0.18, 0.63], [0.50, 0.63], [0.82, 0.63],
    [0.16, 0.38], [0.50, 0.40], [0.84, 0.38],
  ];
  const CAT_SLOT: Record<string, number> = {
    sofa: 1, sofas: 1, bed: 1, beds: 1,
    "tv-unit": 2, "tv-units": 2,
    "coffee-table": 4, "coffee-tables": 4,
    rug: 4, rugs: 4,
    lighting: 7, pendant: 7, chandelier: 7,
    "floor-lamp": 8, "floor-lamps": 8,
    "table-lamp": 5, "table-lamps": 5,
  };

  const slotTaken = new Array(9).fill(false);
  function claimSlot(cat: string, idx: number): number {
    const preferred = CAT_SLOT[cat] ?? CAT_SLOT[cat.split("-")[0]] ?? 4 + (idx % 5);
    const base = Math.max(0, Math.min(8, preferred));
    for (let off = 0; off < 9; off++) {
      const s = (base + off) % 9;
      if (!slotTaken[s]) {
        slotTaken[s] = true;
        return s;
      }
    }
    return base;
  }

  const defaultW: Record<string, number> = {
    sofa: 200, sofas: 200, "coffee-table": 100, "tv-unit": 180,
    rug: 200, lighting: 40, "floor-lamp": 35, "table-lamp": 24,
  };
  const defaultH: Record<string, number> = {
    sofa: 80, sofas: 80, "coffee-table": 45, "tv-unit": 55,
    rug: 12, lighting: 150, "floor-lamp": 160, "table-lamp": 35,
  };

  type Placed = {
    cutout: Buffer | null;
    buf: Buffer | null;
    cat: string;
    sx: number;
    sy: number;
    pxW: number;
    pxH: number;
    floorX: number;
    floorY: number;
    tz: number;
  };

  const placed: Placed[] = [];

  for (let i = 0; i < enriched.length; i++) {
    const sp = enriched[i];
    const p = sp.product;
    const cat = (sp.category || (p.subcategory as string) || "decor")
      .toLowerCase()
      .replace(/_/g, "-")
      .replace(/\s+/g, "-");

    const slot = claimSlot(cat, i);
    const [xFrac, zFrac] = SLOTS[slot];
    const tz = zFrac;

    const prodW =
      ((p.width_cm as number) || (p.length_cm as number) || defaultW[cat] || defaultW[cat.split("-")[0]] || 90);
    const prodH =
      ((p.height_cm as number) || defaultH[cat] || defaultH[cat.split("-")[0]] || 80);

    const scale = pxPerCm(tz, roomW, W, bwR - bwL);
    const pxW = Math.max(60, Math.round(prodW * scale));
    const pxH = Math.max(40, Math.round(prodH * scale));

    const fp = roomToScreen(roomW * xFrac, roomL * zFrac, roomW, roomL, FLOOR_NEAR, FLOOR_FAR);
    const sx = fp.x - Math.round(pxW / 2);
    const sy = fp.y - pxH;

    const cutout = await getProductCutout(p.id as string, p.main_image_url as string);
    placed.push({ cutout, buf: null, cat, sx, sy, pxW, pxH, floorX: fp.x, floorY: fp.y, tz });
  }

  // Sort back-to-front
  placed.sort((a, b) => a.tz - b.tz);

  // Resize cutouts
  await Promise.all(
    placed.map(async (item) => {
      if (!item.cutout) return;
      try {
        item.buf = await sharp(item.cutout)
          .resize(item.pxW, item.pxH, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer();
      } catch {
        // leave buf null
      }
    })
  );

  // Composite onto base room
  const compositeOps: import("sharp").OverlayOptions[] = [];
  const FLOOR_ITEMS = new Set([
    "sofa", "sofas", "bed", "beds", "tv-unit", "tv-units", "coffee-table", "dining-table",
    "chair", "dining-chair", "nightstand", "desk", "wardrobe", "dresser", "sideboard", "storage",
    "bookcase", "floor-lamp", "table-lamp", "decor", "decorative", "plant", "plants", "mirror", "accent-chair"
  ]);

  for (const item of placed) {
    if (!item.buf || !FLOOR_ITEMS.has(item.cat)) continue;
    const left = Math.max(0, Math.min(W - item.pxW, item.sx));
    const top = Math.max(0, Math.min(H - item.pxH, item.sy));
    compositeOps.push({ input: item.buf, left, top, blend: "over" });
  }

  const compositeBuf = await sharp(baseBuf).composite(compositeOps).jpeg({ quality: 93 }).toBuffer();
  const compositeFile = `viz-${Date.now()}-composite.jpg`;
  const compositePath = path.join(uploadsDir, compositeFile);
  writeFileSync(compositePath, compositeBuf);
  console.log(`[composite] Saved ${compositeFile} (${(compositeBuf.length / 1024).toFixed(0)} KB)`);

  // Try AI refinement
  const productLines = enriched
    .map((sp) => {
      const p = sp.product;
      return `${p.name as string} (${sp.category})`;
    })
    .join(", ");

  const refinedBuf = await refineWithPollinations(compositePath, productLines, styleSlug, roomType);

  let finalFile = compositeFile;
  let finalBuf: Buffer<ArrayBufferLike> = compositeBuf as Buffer<ArrayBufferLike>;
  if (refinedBuf) {
    finalFile = `viz-${Date.now()}-photo.jpg`;
    finalBuf = refinedBuf;
    writeFileSync(path.join(uploadsDir, finalFile), finalBuf);
    console.log(`[refine] Saved ${finalFile} (${(finalBuf.length / 1024).toFixed(0)} KB)`);
  } else {
    console.log("[refine] Skipped; using composite as final");
  }

  const visualizationUrl = `/uploads/${finalFile}`;
  db.prepare(
    "UPDATE design_projects SET visualization_url = ?, status = 'completed', updated_at = datetime('now') WHERE id = ?"
  ).run(visualizationUrl, PROJECT_ID);

  console.log("[done] Updated visualization_url:", visualizationUrl);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
