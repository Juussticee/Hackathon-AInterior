import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  type Part,
} from "@google/generative-ai";
import db from "@/lib/db";
import { getStyleBySlug } from "@/lib/styles";
import { generateId } from "@/lib/utils";
import type {
  SpaceAnalysis,
  SelectedProduct,
  Product,
  RoomType,
} from "@/lib/types";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import path from "path";

// Read key from env — the correct key is set in .env.local as AINTERIOR_GEMINI_KEY
// to avoid pollution from other projects on this machine that may set GEMINI_API_KEY.
const GEMINI_API_KEY =
  process.env.AINTERIOR_GEMINI_KEY ||
  process.env.GEMINI_API_KEY ||
  "";

if (!GEMINI_API_KEY) {
  console.error("[ai-engine] AINTERIOR_GEMINI_KEY is not set — AI features will fail");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Safety settings — relaxed for interior design content
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

/**
 * Resolves an imageUrl to a { data, mimeType } pair for Gemini inline images,
 * or returns the original URL string for external images.
 * Returns null if no usable image.
 */
function resolveImageForGemini(
  imageUrl: string | null | undefined
): { inlineData: { data: string; mimeType: string } } | { url: string } | null {
  if (!imageUrl) return null;

  // External HTTPS URL — pass as-is
  if (imageUrl.startsWith("https://")) {
    return { url: imageUrl };
  }

  // Base64 data URL — extract and pass inline
  if (imageUrl.startsWith("data:")) {
    const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return null;
    return { inlineData: { mimeType: match[1], data: match[2] } };
  }

  // Local /uploads/ path — read from disk and encode
  if (imageUrl.startsWith("/uploads/") || imageUrl.startsWith("/public/")) {
    try {
      const filePath = path.join(
        process.cwd(),
        "public",
        imageUrl.startsWith("/public") ? imageUrl.slice(7) : imageUrl
      );
      if (!existsSync(filePath)) return null;
      const buf = readFileSync(filePath);
      const ext = path.extname(filePath).slice(1).toLowerCase();
      const mimeType =
        ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
      return { inlineData: { mimeType, data: buf.toString("base64") } };
    } catch {
      return null;
    }
  }

  return null;
}

// ================================================================
// STAGE 1: Space Analysis (Gemini 1.5 Flash — vision)
// ================================================================
export async function analyzeSpace(
  imageUrl: string | null | undefined,
  roomType: RoomType,
  dimensions: { length: number; width: number; height?: number }
): Promise<SpaceAnalysis> {
  const areaSqm = (dimensions.length / 100) * (dimensions.width / 100);
  const resolvedImage = resolveImageForGemini(imageUrl);

  if (!resolvedImage) {
    console.log("No image provided — using dimension-based analysis");
    return buildFallbackAnalysis(roomType, dimensions, areaSqm);
  }

  const systemPrompt = `You are an expert interior design analyst. Analyze the room photo and return a structured JSON analysis.
Room type: ${roomType}
Dimensions: ${dimensions.length}cm x ${dimensions.width}cm${dimensions.height ? ` x ${dimensions.height}cm` : ""}
Area: ${areaSqm.toFixed(1)} sqm

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "shape": "rectangular",
  "walls": [{"id":"w1","lengthM":4.5,"hasWindow":true,"windowWidthM":1.8,"hasDoor":false,"doorWidthM":null}],
  "existing_furniture": [{"type":"bed","approximateSize":"queen","position":"center-wall"}],
  "floor_type": "hardwood",
  "lighting": "natural-good",
  "available_wall_space_sqm": 12.0,
  "constraints": []
}`;

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      safetySettings,
    });

    // Build parts array for Gemini
    const parts: Part[] = [{ text: systemPrompt }];

    if ("inlineData" in resolvedImage) {
      parts.push({ inlineData: resolvedImage.inlineData });
    } else {
      // External URL: fetch and convert to inline data
      const res = await fetch(resolvedImage.url);
      const buf = Buffer.from(await res.arrayBuffer());
      const ct = res.headers.get("content-type") || "image/jpeg";
      parts.push({ inlineData: { mimeType: ct.split(";")[0], data: buf.toString("base64") } });
    }

    const result = await model.generateContent({ contents: [{ role: "user", parts }] });
    const text = result.response.text().trim();

    // Strip markdown code fences if present
    const jsonText = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(jsonText);

    return {
      roomType,
      estimatedAreaSqm: areaSqm,
      shape: parsed.shape || "rectangular",
      walls: parsed.walls || [],
      existingFurniture: parsed.existing_furniture || [],
      floorType: parsed.floor_type || "unknown",
      lighting: parsed.lighting || "mixed",
      availableWallSpaceSqm: parsed.available_wall_space_sqm || areaSqm * 0.7,
      constraints: parsed.constraints || [],
    };
  } catch (error) {
    console.error("Space analysis error:", error);
    return buildFallbackAnalysis(roomType, dimensions, areaSqm);
  }
}

function buildFallbackAnalysis(
  roomType: RoomType,
  dimensions: { length: number; width: number; height?: number },
  areaSqm: number
): SpaceAnalysis {
  return {
    roomType,
    estimatedAreaSqm: areaSqm,
    shape: "rectangular",
    walls: [
      { id: "w1", lengthM: dimensions.length / 100, hasWindow: true, hasDoor: false },
      { id: "w2", lengthM: dimensions.width / 100, hasWindow: false, hasDoor: true },
      { id: "w3", lengthM: dimensions.length / 100, hasWindow: false, hasDoor: false },
      { id: "w4", lengthM: dimensions.width / 100, hasWindow: false, hasDoor: false },
    ],
    existingFurniture: [],
    floorType: "unknown",
    lighting: "mixed",
    availableWallSpaceSqm: areaSqm * 0.7,
    constraints: [],
  };
}

// ================================================================
// STAGE 2: Product Pre-filtering (deterministic)
// ================================================================
// Raw DB row type (snake_case columns)
type RawProduct = Product & {
  style_tags: string;
  room_types: string;
  price_aed: number;
  company_name: string;
};

function filterProducts(
  styleSlug: string,
  roomType: string,
  budgetAed: number,
  requiredCategories: string[]
): RawProduct[] {
  const maxItemPrice = budgetAed * 0.6;
  const rows = db
    .prepare(
      `SELECT p.*, c.name as company_name FROM products p
       JOIN companies c ON p.company_id = c.id
       WHERE p.is_available = 1 AND c.enabled = 1
         AND p.price_aed <= ?
       ORDER BY p.is_featured DESC, p.price_aed ASC`
    )
    .all(maxItemPrice) as RawProduct[];

  return rows.filter((p) => {
    // style_tags is a JSON string in the DB
    let styleTags: string[] = [];
    try { styleTags = JSON.parse(p.style_tags || "[]"); } catch { styleTags = []; }
    const matchesStyle =
      styleTags.length === 0 ||
      styleTags.some((tag: string) => tag.toLowerCase() === styleSlug.toLowerCase());

    // room_types is a JSON string in the DB
    let roomTypes: string[] = [];
    try { roomTypes = JSON.parse(p.room_types || "[]"); } catch { roomTypes = []; }
    const matchesRoom = roomTypes.length === 0 || roomTypes.includes(roomType);

    return matchesStyle && matchesRoom;
  });
}

// ================================================================
// STAGE 3: AI Product Selection (Gemini 1.5 Flash — text)
// ================================================================
export async function selectProducts(
  spaceAnalysis: SpaceAnalysis,
  styleSlug: string,
  budgetAed: number,
  additionalRequirements: string | null
): Promise<SelectedProduct[]> {
  const style = getStyleBySlug(styleSlug);
  if (!style) throw new Error(`Unknown style: ${styleSlug}`);

  const requiredCategories =
    style.categoryRequirements[spaceAnalysis.roomType] || [];

  const candidates = filterProducts(
    styleSlug,
    spaceAnalysis.roomType,
    budgetAed,
    requiredCategories
  );

  if (candidates.length === 0) {
    throw new Error("No matching products found in catalog");
  }

  const productSummary = candidates.map((p, i) => {
    let colors: string[] = [];
    try { colors = JSON.parse(p.colors as unknown as string || "[]"); } catch { colors = []; }
    let styleTags: string[] = [];
    try { styleTags = JSON.parse(p.style_tags || "[]"); } catch { styleTags = []; }
    return {
      index: i + 1,
      id: p.id,
      name: p.name,
      subcategory: p.subcategory,
      price_aed: p.price_aed,
      colors,
      materials: p.materials,
      style_tags: styleTags,
    };
  });

  const prompt = `You are an expert interior designer AI. Select furniture for a room.

ROOM:
- Type: ${spaceAnalysis.roomType}
- Area: ${spaceAnalysis.estimatedAreaSqm.toFixed(1)} sqm
- Shape: ${spaceAnalysis.shape}
- Floor: ${spaceAnalysis.floorType}
- Lighting: ${spaceAnalysis.lighting}

STYLE: ${style.name}
Materials: ${style.materials.join(", ")}
Colors: ${style.colorPalette.primary.join(", ")}, ${style.colorPalette.accent.join(", ")}

BUDGET: AED ${budgetAed} total (stay within this)
REQUIRED CATEGORIES: ${requiredCategories.join(", ")}
${additionalRequirements ? `USER REQUIREMENTS: ${additionalRequirements}` : ""}

AVAILABLE PRODUCTS (${productSummary.length} items):
${JSON.stringify(productSummary, null, 2)}

Select 6-10 products. Cover all required categories. Stay within AED ${budgetAed} total. Ensure color/material harmony.

Return ONLY valid JSON (no markdown):
{
  "selected": [
    {"product_id": "exact id", "category": "category name", "reason": "why selected"}
  ],
  "total_cost_aed": 1234
}`;

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      safetySettings,
      generationConfig: { responseMimeType: "application/json" },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonText = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(jsonText);

    const selected: SelectedProduct[] = [];
    const validIds = new Set(candidates.map((c) => c.id));

    for (const item of parsed.selected || []) {
      if (validIds.has(item.product_id)) {
        selected.push({
          productId: item.product_id,
          reason: item.reason || "Selected for this room design",
          category: item.category || "general",
        });
      }
    }

    if (selected.length === 0) throw new Error("AI selected no valid products");
    return selected;
  } catch (error) {
    console.error("Product selection error:", error);
    throw error;
  }
}

// ================================================================
// STAGE 4: Visualization (Pollinations AI — free, no API key)
// ================================================================
export async function generateVisualization(
  spaceAnalysis: SpaceAnalysis,
  selectedProducts: (SelectedProduct & { product: Product })[],
  styleSlug: string
): Promise<string | null> {
  const style = getStyleBySlug(styleSlug);
  if (!style) return null;

  // Build rich visual descriptions for each product instead of raw names.
  // Image models understand "queen bed in light walnut wood" but NOT
  // "Supreme 160X200 Queen Bed - Light Walnut".
  const visualItems = selectedProducts.slice(0, 8).map((sp) => {
    const p = sp.product as unknown as Record<string, string>;
    const subcategory = (sp.category || p.subcategory || "furniture")
      .replace(/-/g, " ")
      .replace(/_/g, " ");

    // Parse colors (stored as JSON array string in DB)
    let colors: string[] = [];
    try {
      colors = JSON.parse(p.colors || "[]");
    } catch {
      colors = [];
    }
    const primaryColor = colors[0] || "";

    // Parse materials
    const materials = (p.materials || "")
      .split(",")
      .map((m: string) => m.trim().toLowerCase())
      .filter(Boolean);
    const keyMaterial = materials[0] || "";

    // Build visual phrase: "light walnut wood queen bed"
    const parts: string[] = [];
    if (primaryColor) parts.push(primaryColor.toLowerCase());
    if (keyMaterial && !primaryColor.toLowerCase().includes(keyMaterial)) {
      parts.push(keyMaterial);
    }
    parts.push(subcategory);

    return parts.join(" ");
  });

  // Group similar items for brevity (e.g., "2 light walnut nightstands")
  const itemCounts = new Map<string, number>();
  for (const item of visualItems) {
    itemCounts.set(item, (itemCounts.get(item) || 0) + 1);
  }
  const furnitureDescriptions = Array.from(itemCounts.entries())
    .map(([desc, count]) => (count > 1 ? `${count} ${desc}s` : desc))
    .join(", ");

  // Extract style visual cues
  const styleColors = style.colorPalette.primary.slice(0, 3)
    .map((hex) => {
      // Convert hex to readable name approximation
      const names: Record<string, string> = {
        "#FFFFFF": "white", "#F5F5F5": "light grey", "#E0E0E0": "grey",
        "#9E9E9E": "medium grey", "#212121": "charcoal", "#424242": "dark grey",
        "#616161": "grey", "#F5F0EB": "warm cream", "#E8DDD3": "warm beige",
        "#D4C5B5": "sand", "#C4A882": "golden oak", "#8B7355": "warm brown",
        "#6B5B45": "dark brown", "#4A4035": "espresso", "#2C2418": "dark chocolate",
      };
      return names[hex] || hex;
    })
    .join(", ");

  const roomDesc = spaceAnalysis.roomType.replace("_", " ");
  const prompt = [
    `Professional interior design photograph of a ${roomDesc}`,
    `wide-angle shot from the room entrance looking inward`,
    `${style.name} style interior`,
    `${spaceAnalysis.estimatedAreaSqm.toFixed(0)} square meter room`,
    `furniture: ${furnitureDescriptions}`,
    `walls and textiles in ${styleColors}`,
    style.materials.length > 0
      ? `materials: ${style.materials.slice(0, 4).join(", ")}`
      : null,
    style.lightingPreference
      ? style.lightingPreference
      : "warm afternoon natural lighting from windows",
    "photorealistic, magazine quality, professional staging, 8k resolution, architectural photography",
    "warm inviting mood, lived-in feel",
  ]
    .filter(Boolean)
    .join(", ") + ", no people, no text, no watermarks, no logos, no clutter";

  console.log("[viz] Prompt:", prompt.slice(0, 200));

  try {
    const encoded = encodeURIComponent(prompt);
    const seed = Math.abs(prompt.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % 100000;
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encoded}?width=1344&height=768&model=flux&seed=${seed}&nologo=true`;

    // Pre-fetch server-side: Pollinations returns 200 with empty body while generating.
    // We must wait for actual image bytes before returning.
    const maxAttempts = 6;
    const delayMs = 8000; // 8 seconds between retries

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`[viz] Attempt ${attempt}/${maxAttempts} fetching Pollinations image...`);
      const res = await fetch(pollinationsUrl);
      const buf = await res.arrayBuffer();

      if (res.ok && buf.byteLength > 1000) {
        // Got a real image — save locally so browser can load it instantly
        const uploadsDir = path.join(process.cwd(), "public", "uploads");
        if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

        const filename = `viz-${Date.now()}-${seed}.jpg`;
        const filePath = path.join(uploadsDir, filename);
        writeFileSync(filePath, Buffer.from(buf));
        console.log(`[viz] Saved ${filename} (${(buf.byteLength / 1024).toFixed(0)} KB)`);
        return `/uploads/${filename}`;
      }

      console.log(`[viz] Got ${buf.byteLength} bytes (attempt ${attempt}), waiting ${delayMs / 1000}s...`);
      // Wait before retrying — image is still generating on Pollinations side
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    // All retries exhausted — return the Pollinations URL as fallback.
    // The browser may still load it if it finishes generating.
    console.warn("[viz] Pre-fetch exhausted, returning Pollinations URL as fallback");
    return pollinationsUrl;
  } catch (error) {
    console.error("Visualization generation error:", error);
    return null;
  }
}

// ================================================================
// STAGE 5: Design Explanation (Gemini 1.5 Flash — text)
// ================================================================
export async function generateExplanation(
  spaceAnalysis: SpaceAnalysis,
  selectedProducts: (SelectedProduct & { product: Product })[],
  styleSlug: string,
  totalCost: number,
  budget: number
): Promise<string> {
  const style = getStyleBySlug(styleSlug);

  const productList = selectedProducts
    .map(
      (sp) => {
        const price = (sp.product as unknown as Record<string, number>).price_aed || 0;
        return `- ${sp.product.name} (${sp.product.subcategory}) — AED ${price}: ${sp.reason}`;
      }
    )
    .join("\n");

  const prompt = `Write a brief, elegant interior design explanation for a client.

Room: ${spaceAnalysis.roomType.replace("_", " ")}, ${spaceAnalysis.estimatedAreaSqm.toFixed(1)} sqm
Style: ${style?.name || styleSlug}
Total cost: AED ${totalCost} (budget: AED ${budget})

Selected products:
${productList}

Write 3-4 short paragraphs covering:
1. Overall design concept and how ${style?.name || styleSlug} style was applied
2. Key furniture selections and how they complement each other
3. Color harmony and material choices
4. How the design optimizes the space

Keep it professional, warm, and exciting. No bullet points — flowing paragraphs only.`;

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      safetySettings,
    });

    const result = await model.generateContent(prompt);
    return (
      result.response.text() ||
      "Your personalized design has been created with carefully selected pieces from our approved UAE catalog."
    );
  } catch (error) {
    console.error("Explanation generation error:", error);
    return "Your personalized design has been created with carefully selected pieces that reflect the essence of your chosen style and perfectly suit your space.";
  }
}

// ================================================================
// FULL PIPELINE
// ================================================================
export async function runDesignPipeline(params: {
  projectId: string;
  roomImageUrl: string | null;
  roomType: RoomType;
  dimensions: { length: number; width: number; height?: number };
  styleSlug: string;
  budgetAed: number;
  additionalRequirements: string | null;
}): Promise<{
  spaceAnalysis: SpaceAnalysis;
  selectedProducts: SelectedProduct[];
  visualizationUrl: string | null;
  explanation: string;
  totalCostAed: number;
}> {
  const { projectId } = params;

  db.prepare(
    "UPDATE design_projects SET status = 'processing', updated_at = datetime('now') WHERE id = ?"
  ).run(projectId);

  // Stage 1: Analyze space
  const spaceAnalysis = await analyzeSpace(
    params.roomImageUrl,
    params.roomType,
    params.dimensions
  );

  // Stage 2 + 3: Filter & select products
  const selectedProducts = await selectProducts(
    spaceAnalysis,
    params.styleSlug,
    params.budgetAed,
    params.additionalRequirements
  );

  // Enrich with full product data from DB — batched WHERE IN to avoid N+1
  const productIds = selectedProducts.map((sp) => sp.productId);
  const productMap = new Map<string, Product>();
  if (productIds.length > 0) {
    const placeholders = productIds.map(() => "?").join(",");
    const rows = db
      .prepare(`SELECT * FROM products WHERE id IN (${placeholders})`)
      .all(...productIds) as Product[];
    for (const row of rows) {
      productMap.set(row.id, row);
    }
  }
  const enriched = selectedProducts
    .map((sp) => {
      const product = productMap.get(sp.productId);
      return product ? { ...sp, product } : null;
    })
    .filter(Boolean) as (SelectedProduct & { product: Product })[];

  // Stage 4 + 5: Visualization and Explanation are independent — run in parallel
  const totalCostAed = enriched.reduce(
    (sum, sp) => sum + ((sp.product as unknown as Record<string, number>).price_aed || 0),
    0
  );

  const [visualizationUrl, explanation] = await Promise.all([
    generateVisualization(spaceAnalysis, enriched, params.styleSlug),
    generateExplanation(spaceAnalysis, enriched, params.styleSlug, totalCostAed, params.budgetAed),
  ]);

  // Save results
  db.prepare(
    `UPDATE design_projects SET
       status = 'completed',
       space_analysis = ?,
       selected_products = ?,
       visualization_url = ?,
       design_explanation = ?,
       total_cost_aed = ?,
       updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    JSON.stringify(spaceAnalysis),
    JSON.stringify(selectedProducts),
    visualizationUrl,
    explanation,
    totalCostAed,
    projectId
  );

  return {
    spaceAnalysis,
    selectedProducts,
    visualizationUrl,
    explanation,
    totalCostAed,
  };
}
