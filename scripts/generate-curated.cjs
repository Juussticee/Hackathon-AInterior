const fs = require("fs");
const path = require("path");

async function generate({ styleName, roomType, length, width, products, outFile, extraRoomDetails }) {
  const productLines = products
    .map((p) => {
      const dims = [p.length, p.width, p.height].filter(Boolean).join("×");
      return `- ${p.name} (${p.color})${dims ? `, ${dims}cm` : ""}`;
    })
    .join("\n");

  const prompt = [
    `Interior design magazine photo, ${styleName} ${roomType}, ${(length / 100).toFixed(1)}m × ${(width / 100).toFixed(1)}m.`,
    `Photorealistic 3D visualization using ONLY these exact real-life products. Do not redesign or substitute.`,
    `Preserve exact appearance, proportions, dimensions, materials, colors, finishes, shapes, and distinctive details.`,
    `Products:\n${productLines}`,
    `Arrange all products in one cohesive realistic interior with proper spacing, circulation, and alignment.`,
    `Professional architectural photograph, realistic perspective, natural lighting, soft shadows, textures, depth.`,
    `${extraRoomDetails}`,
    `High-end, clean, photorealistic, suitable for professional presentation. No people.`,
  ].join(" ");

  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1344&height=756&seed=${Date.now() % 99999}&nologo=true&enhance=true&model=flux`;

  console.error(`[curated] Generating ${styleName} ${roomType}…`);
  const res = await fetch(url, { signal: AbortSignal.timeout(90000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 10000) throw new Error("Response too small");

  const outPath = path.join("public", "uploads", outFile);
  fs.writeFileSync(outPath, buf);
  console.log(outPath);
  console.error(`[curated] Saved ${outFile} (${(buf.length / 1024).toFixed(0)} KB)`);
}

const configs = [
  {
    styleName: "Minimalist",
    roomType: "living room",
    length: 500,
    width: 400,
    outFile: "viz-minimalist-living_room-reference.jpg",
    extraRoomDetails: "Bright white walls, light oak herringbone floor, large window with soft natural daylight from the left, cream linen curtains, minimal decor — small potted plant, framed abstract wall art, floor lamp.",
    products: [
      { name: "Beatrice 3-Seater Fabric Sofa Bed - Light Grey", color: "Light Grey", length: 210, width: 90, height: 85 },
      { name: "Vito Coffee Table - Set of 2 - White", color: "White", length: 100, width: 60, height: 40 },
      { name: "Supreme TV Unit With 2-Door Up to 65 Inches - White", color: "White", length: 180, width: 45, height: 50 },
      { name: "Urban LED Pendant 3-Color Dimmable", color: "Smoke Grey", length: 80, width: 80, height: 120 },
      { name: "Plush Soft Fur Solid Rug - Dark Grey - 200x300 cm", color: "Dark Grey", length: 300, width: 200, height: 3 },
    ],
  },
  {
    styleName: "Minimalist",
    roomType: "dining room",
    length: 350,
    width: 300,
    outFile: "viz-minimalist-dining_room-reference.jpg",
    extraRoomDetails: "Bright white walls, light oak floor, large window with sheer white curtains, modern pendant light above table, minimal framed art on wall.",
    products: [
      { name: "Calus 6-Seater Dining Table - Sintered Stone - Milky White/Black", color: "Milky White/Black", length: 180, width: 90, height: 75 },
      { name: "Minimalist black dining chairs", color: "Black", length: 45, width: 50, height: 85 },
      { name: "Urban LED Pendant 3-Color Dimmable", color: "Smoke Grey", length: 80, width: 80, height: 120 },
    ],
  },
];

(async () => {
  for (const cfg of configs) {
    try {
      await generate(cfg);
    } catch (err) {
      console.error(`[curated] Failed ${cfg.styleName} ${cfg.roomType}:`, err.message);
    }
  }
})();
