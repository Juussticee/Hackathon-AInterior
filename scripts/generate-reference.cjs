const fs = require("fs");
const path = require("path");

async function generate({ styleName, roomType, length, width, products, outFile }) {
  const productLines = products
    .map((p) => {
      const dims = [p.length, p.width, p.height].filter(Boolean).join("×");
      return `- ${p.name} (${p.color})${dims ? `, ${dims}cm` : ""}`;
    })
    .join("\n");

  const prompt = [
    `Create a photorealistic 3D visualization of the room using the exact real-life products provided.`,
    `Do not redesign, substitute, simplify, or generate similar-looking products.`,
    `Preserve each product's exact appearance, proportions, dimensions, materials, colors, finishes, shapes, hardware, and distinctive details.`,
    `Room: ${styleName} ${roomType}, ${(length / 100).toFixed(1)}m × ${(width / 100).toFixed(1)}m. Scale everything accurately.`,
    `Products in the room:\n${productLines}`,
    `Arrange all products into one cohesive, realistic interior space with realistic spacing, circulation, clearance, and alignment.`,
    `Professional architectural/interior-design photograph of the actual finished room.`,
    `Realistic perspective, proportions, lighting, shadows, reflections, textures, and depth.`,
    `Include walls, floor, ceiling, doors/windows. Clean, high-end, photorealistic, suitable for professional presentation.`,
    `Prioritize dimensional accuracy and product fidelity over artistic interpretation.`,
  ].join(" ");

  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1344&height=756&seed=${Date.now() % 99999}&nologo=true&enhance=true&model=flux`;

  console.error(`[ref] Generating ${styleName} ${roomType}…`);
  const res = await fetch(url, { signal: AbortSignal.timeout(90000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 10000) throw new Error("Response too small");

  const outPath = path.join("public", "uploads", outFile);
  fs.writeFileSync(outPath, buf);
  console.log(outPath);
  console.error(`[ref] Saved ${outFile} (${(buf.length / 1024).toFixed(0)} KB)`);
}

const configs = [
  {
    styleName: "Japandi",
    roomType: "bedroom",
    length: 400,
    width: 350,
    outFile: "viz-japandi-bedroom-reference.jpg",
    products: [
      { name: "Dreamscape 160x200 Upholstered Queen Bed - Light Beige", color: "Light Beige", length: 200, width: 160, height: 100 },
      { name: "Supreme 2-Drawer Nightstand - Light Walnut", color: "Light Walnut", length: 50, width: 45, height: 55 },
      { name: "Seon Glass Pendant Chandelier - D250xH1500mm", color: "Amber", length: 25, width: 25, height: 150 },
      { name: "Sanrio Ceramic Table Lamp - 51cm", color: "Ceramic", length: 25, width: 25, height: 51 },
      { name: "Plush Soft Fur Solid Rug - Light Brown - 200x300 cm", color: "Light Brown", length: 300, width: 200, height: 3 },
    ],
  },
  {
    styleName: "Minimalist",
    roomType: "bedroom",
    length: 400,
    width: 350,
    outFile: "viz-minimalist-bedroom-reference.jpg",
    products: [
      { name: "Supreme 160X200 Queen Bed - Light Walnut", color: "Light Walnut", length: 222.5, width: 168, height: 100.5 },
      { name: "Supreme 2-Drawer Nightstand - Light Walnut", color: "Light Walnut", length: 50, width: 45, height: 55 },
      { name: "Supreme 6-Drawer Master Dresser With Mirror - Light Walnut", color: "Light Walnut", length: 160, width: 50, height: 80 },
      { name: "Jonathan Globe Table Lamp 22x24x35 cm", color: "Globe", length: 22, width: 24, height: 35 },
      { name: "Amber Contemporary Rugs 200X300 White", color: "White", length: 300, width: 200, height: 2 },
    ],
  },
  {
    styleName: "Minimalist",
    roomType: "living room",
    length: 500,
    width: 400,
    outFile: "viz-minimalist-living_room-reference.jpg",
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
    products: [
      { name: "Calus 6-Seater Dining Table - Sintered Stone - Milky White/Black", color: "Milky White/Black", length: 180, width: 90, height: 75 },
      { name: "Urban LED Pendant 3-Color Dimmable", color: "Smoke Grey", length: 80, width: 80, height: 120 },
    ],
  },
];

(async () => {
  for (const cfg of configs) {
    try {
      await generate(cfg);
    } catch (err) {
      console.error(`[ref] Failed ${cfg.styleName} ${cfg.roomType}:`, err.message);
    }
  }
})();
