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

/** Race a promise against a timeout — prevents pipeline hangs on flaky APIs */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

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

    const result = await withTimeout(
      model.generateContent({ contents: [{ role: "user", parts }] }),
      30_000,
      "Space analysis"
    );
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

// ---- Category normalization ----
// Maps root furniture concepts to all known DB subcategory variants
const CATEGORY_SYNONYMS: Record<string, string[]> = {
  bed: ["beds", "bed", "bed-frame", "bed_frame"],
  nightstand: ["nightstands", "nightstand", "bedside-table", "bedside_table"],
  dresser: ["dressers", "dresser"],
  chair: ["chairs", "chair", "accent-chair", "accent_chair", "armchair", "dining-chair", "dining_chair"],
  sofa: ["sofas", "sofa", "couch"],
  table: ["tables", "table", "dining-tables", "dining_tables", "coffee-tables", "coffee_tables", "side-tables", "side_tables", "console-tables", "console_tables"],
  desk: ["desks", "desk", "writing-desk", "writing_desk"],
  rug: ["rugs", "rug"],
  lamp: ["floor-lamps", "floor_lamps", "table-lamps", "table_lamps", "pendant-lights", "pendant_lights", "lamp", "lamps", "lighting"],
  storage: ["storage", "bookcases", "bookcase", "shelving", "wardrobe", "cabinet"],
  mirror: ["mirrors", "mirror"],
  tv_unit: ["tv-units", "tv_units", "tv-unit", "media-unit", "media_unit"],
  decor: ["decor", "vases", "vase", "cushions", "art", "wall-art"],
  sideboard: ["sideboard", "sideboards", "buffet", "credenza"],
};

/**
 * Expand a list of category names (e.g. ["bed", "chair"]) into all known
 * DB subcategory variants (e.g. ["beds", "bed", "chairs", "chair", ...]).
 * Handles singular/plural/hyphen/underscore mismatches between style
 * definitions and the actual database subcategory column.
 */
function expandCategories(categories: string[]): Set<string> {
  const result = new Set<string>();
  for (const cat of categories) {
    const lower = cat.toLowerCase().trim();
    if (!lower) continue;
    // Direct add
    result.add(lower);
    // Find matching synonym group by checking if any key/synonym matches
    for (const [, synonyms] of Object.entries(CATEGORY_SYNONYMS)) {
      if (synonyms.some((s) => s === lower || s.replace(/[-_s]$/g, "") === lower.replace(/[-_s]$/g, ""))) {
        synonyms.forEach((s) => result.add(s));
      }
    }
  }
  return result;
}

/**
 * Parse user's free-text requirements to extract furniture category keywords.
 * E.g. "I need a chair, a table, and a bed" → ["chair", "table", "bed"]
 */
function parseUserCategories(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  const furnitureKeywords: Record<string, string[]> = {
    bed: ["bed", "beds", "bed frame", "bedframe"],
    chair: ["chair", "chairs", "armchair", "accent chair", "dining chair"],
    table: ["table", "tables", "dining table", "coffee table", "side table", "desk"],
    sofa: ["sofa", "sofas", "couch"],
    desk: ["desk", "desks", "writing desk", "work desk"],
    rug: ["rug", "rugs", "carpet"],
    lamp: ["lamp", "lamps", "floor lamp", "table lamp", "pendant", "pendant light", "chandelier"],
    storage: ["storage", "shelf", "shelves", "bookshelf", "bookcase", "cabinet", "wardrobe"],
    mirror: ["mirror", "mirrors"],
    dresser: ["dresser", "dressers", "chest of drawers"],
    nightstand: ["nightstand", "nightstands", "bedside table"],
    tv_unit: ["tv unit", "tv stand", "media unit", "tv console"],
    sideboard: ["sideboard", "buffet", "credenza"],
  };
  for (const [category, keywords] of Object.entries(furnitureKeywords)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        found.push(category);
        break;
      }
    }
  }
  return found;
}

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

  // Normalize required categories into all known DB subcategory variants
  const expandedCats = expandCategories(requiredCategories);
  const hasCatFilter = expandedCats.size > 0;

  // Helper: check if a product matches room + category filters
  const matchRoomCat = (p: RawProduct): boolean => {
    let roomTypes: string[] = [];
    try { roomTypes = JSON.parse(p.room_types || "[]"); } catch { roomTypes = []; }
    const matchesRoom = roomTypes.length === 0 || roomTypes.includes(roomType);
    const sub = (p.subcategory || "").toLowerCase().replace(/\s+/g, "-");
    const matchesCategory = !hasCatFilter || expandedCats.has(sub);
    return matchesRoom && matchesCategory;
  };

  // Helper: check if a product matches the style filter
  const matchStyle = (p: RawProduct): boolean => {
    let styleTags: string[] = [];
    try { styleTags = JSON.parse(p.style_tags || "[]"); } catch { styleTags = []; }
    return (
      styleTags.length === 0 ||
      styleTags.some((tag: string) => tag.toLowerCase() === styleSlug.toLowerCase())
    );
  };

  // First attempt: style + room + category
  const strict = rows.filter((p) => matchStyle(p) && matchRoomCat(p));

  // Fallback 1: if style is too restrictive (new styles with no tagged products),
  // relax the style filter but keep room + category
  if (strict.length < 5) {
    const relaxed = rows.filter(matchRoomCat);
    if (relaxed.length >= 5) {
      console.warn(
        `[filterProducts] Style "${styleSlug}" matched only ${strict.length} products, ` +
        `falling back to room+category filter (${relaxed.length} candidates)`
      );
      return relaxed;
    }

    // Fallback 2: room has no tagged products (e.g. studio, kids_room)
    // Drop room filter, keep category + style
    const noRoom = rows.filter((p) => {
      const sub = (p.subcategory || "").toLowerCase().replace(/\s+/g, "-");
      const matchesCategory = !hasCatFilter || expandedCats.has(sub);
      return matchStyle(p) && matchesCategory;
    });
    if (noRoom.length >= 5) {
      console.warn(
        `[filterProducts] Room "${roomType}" has no tagged products, ` +
        `falling back to style+category filter (${noRoom.length} candidates)`
      );
      return noRoom;
    }

    // Fallback 3: drop all filters except price — use entire catalog
    if (rows.length > 0) {
      console.warn(
        `[filterProducts] All filters exhausted, returning full catalog (${rows.length} candidates)`
      );
      return rows;
    }
  }

  return strict;
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

  const styleCategories =
    style.categoryRequirements[spaceAnalysis.roomType] || [];

  // Parse user's free-text requirements into furniture categories
  const userCategories = additionalRequirements
    ? parseUserCategories(additionalRequirements)
    : [];

  // Merge style + user categories (deduplicated)
  const allCategories = [...new Set([...styleCategories, ...userCategories])];

  const candidates = filterProducts(
    styleSlug,
    spaceAnalysis.roomType,
    budgetAed,
    allCategories
  );

  // Fallback: if category filter is too restrictive, retry with style categories only
  let finalCandidates = candidates;
  if (candidates.length < 5 && userCategories.length > 0) {
    console.warn(
      `[selectProducts] Only ${candidates.length} candidates with all categories, retrying with style-only filter`
    );
    finalCandidates = filterProducts(
      styleSlug,
      spaceAnalysis.roomType,
      budgetAed,
      styleCategories
    );
  }

  if (finalCandidates.length === 0) {
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

  const userCatLine = userCategories.length > 0
    ? `\nMANDATORY USER-REQUESTED ITEMS (you MUST include at least one product for each): ${userCategories.join(", ")}`
    : "";

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
STYLE CATEGORIES: ${styleCategories.join(", ")}${userCatLine}
${additionalRequirements ? `USER REQUIREMENTS: ${additionalRequirements}` : ""}

AVAILABLE PRODUCTS (${productSummary.length} items):
${JSON.stringify(productSummary, null, 2)}

RULES:
1. Select 6-10 products total.
2. You MUST cover every user-requested item — if the user asks for a "chair", "table", and "bed", your selection MUST include at least one chair, one table, and one bed.
3. Then fill remaining slots from the style categories.
4. Stay within AED ${budgetAed} total.
5. Ensure color/material harmony.

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

    // Retry up to 2 times on 429 rate-limit errors (free tier: 20 RPD)
    let result;
    let lastError: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        result = await withTimeout(model.generateContent(prompt), 60_000, "Product selection");
        break;
      } catch (err) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        const is429 = msg.includes("429") || msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("rate");
        if (is429 && attempt < 3) {
          // Extract retry-after from error or use exponential back-off
          const retryMatch = msg.match(/(\d+(?:\.\d+)?)s/);
          const waitMs = retryMatch ? Math.min(parseFloat(retryMatch[1]) * 1000, 60_000) : attempt * 15_000;
          console.warn(`[selectProducts] Gemini 429 on attempt ${attempt}, retrying in ${(waitMs/1000).toFixed(0)}s...`);
          await new Promise(r => setTimeout(r, waitMs));
        } else {
          throw err;
        }
      }
    }
    if (!result) throw lastError;
    const text = result.response.text().trim();
    const jsonText = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(jsonText);

    const selected: SelectedProduct[] = [];
    const validIds = new Set(finalCandidates.map((c) => c.id));

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

    // Post-validation: check user-requested categories are covered
    if (userCategories.length > 0) {
      const selectedSubs = new Set(
        selected.map((s) => {
          const prod = finalCandidates.find((c) => c.id === s.productId);
          return (prod?.subcategory || "").toLowerCase().replace(/\s+/g, "-");
        })
      );
      const selectedCats = selected.map((s) => (s.category || "").toLowerCase());

      for (const userCat of userCategories) {
        const expanded = expandCategories([userCat]);
        const covered =
          [...expanded].some((e) => selectedSubs.has(e)) ||
          selectedCats.some((c) => c.includes(userCat));
        if (!covered) {
          console.warn(
            `[selectProducts] User-requested "${userCat}" not covered by AI selection. ` +
            `Selected subcategories: ${[...selectedSubs].join(", ")}`
          );
        }
      }
    }

    return selected;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const is429 = msg.includes("429") || msg.toLowerCase().includes("quota");

    if (is429) {
      // Gemini quota exhausted for today — deterministically pick top products per style category
      console.warn("[selectProducts] Gemini quota exhausted, using deterministic fallback selector");
      return deterministicSelect(finalCandidates, styleCategories, budgetAed);
    }

    console.error("Product selection error:", error);
    throw error;
  }
}

/**
 * Deterministic product selection used when Gemini is unavailable.
 * Picks the highest-value featured products per style category up to budget.
 */
function deterministicSelect(
  candidates: RawProduct[],
  styleCategories: string[],
  budgetAed: number
): SelectedProduct[] {
  const selected: SelectedProduct[] = [];
  let remaining = budgetAed;
  const usedIds = new Set<string>();

  // First pass: pick one product per style category
  for (const cat of styleCategories) {
    const synonyms = expandCategories([cat]);
    const match = candidates.find((p) => {
      const sub = (p.subcategory || "").toLowerCase().replace(/\s+/g, "-");
      return synonyms.has(sub) && !usedIds.has(p.id) && p.price_aed <= remaining * 0.6;
    });
    if (match) {
      selected.push({ productId: match.id, reason: `Selected as ${cat} for this room`, category: cat });
      usedIds.add(match.id);
      remaining -= match.price_aed;
    }
  }

  // Second pass: fill to 6 items with featured products
  for (const p of candidates) {
    if (selected.length >= 6) break;
    if (!usedIds.has(p.id) && p.price_aed <= remaining * 0.5) {
      const sub = (p.subcategory || "").toLowerCase();
      selected.push({ productId: p.id, reason: `Complementary piece: ${sub}`, category: sub });
      usedIds.add(p.id);
      remaining -= p.price_aed;
    }
  }

  if (selected.length === 0 && candidates.length > 0) {
    // Last resort: just return first 5 affordable candidates
    const affordable = candidates.filter(p => p.price_aed <= budgetAed * 0.3).slice(0, 5);
    affordable.forEach(p => selected.push({ productId: p.id, reason: "Curated selection", category: p.subcategory || "furniture" }));
  }

  return selected;
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

  // Per-style trigger words — text-to-image models respond strongly to these
  // rather than just a style name. These are carefully chosen to steer Flux.
  const STYLE_TRIGGERS: Record<string, string> = {
    minimalist: "minimalist, uncluttered, monochromatic, negative space, serene",
    japandi: "japandi, wabi-sabi, Scandinavian hygge, organic warmth, muted earth tones, zen",
    modern: "contemporary modern, geometric forms, polished surfaces, bold contrast",
    industrial: "urban loft, exposed brick, raw metal, reclaimed wood, Edison bulbs, factory aesthetic",
    bohemian: "boho eclectic, layered textiles, macramé, woven patterns, Moroccan lanterns, terracotta accents",
    coastal: "coastal beach house, whitewashed wood, ocean blue accents, rattan furniture, linen curtains, sun-bleached palette, breezy seaside",
  };
  const styleTriggers = STYLE_TRIGGERS[styleSlug] || style.name;

  // Comprehensive hex→name map covering all 6 styles
  const HEX_NAMES: Record<string, string> = {
    // Whites/grays
    "#FFFFFF": "crisp white", "#F5F5F5": "off-white", "#E0E0E0": "light grey",
    "#9E9E9E": "medium grey", "#616161": "grey", "#424242": "dark grey",
    "#212121": "charcoal", "#BDBDBD": "silver grey",
    // Japandi / warm
    "#F5F0EB": "warm cream", "#E8DDD3": "warm beige", "#D4C5B5": "sandy beige",
    "#C4A882": "golden tan", "#8B7355": "warm brown", "#6B5B45": "dark walnut",
    "#4A4035": "espresso", "#2C2418": "dark chocolate",
    // Bohemian
    "#FFF8E1": "warm ivory", "#FFECB3": "pale gold", "#D7CCC8": "dusty rose",
    "#A1887F": "terracotta beige", "#E65100": "burnt orange", "#BF360C": "rust red",
    "#1B5E20": "deep forest green", "#4A148C": "deep violet",
    // Industrial
    "#5D4037": "raw umber", "#795548": "bronze brown", "#3E2723": "dark iron",
    "#FF8F00": "amber",
    // Coastal
    "#E3F2FD": "pale sky blue", "#BBDEFB": "soft ocean blue",
    "#0277BD": "deep ocean blue", "#01579B": "navy",
    "#00838F": "teal", "#4DB6AC": "seafoam green",
    // Modern
    "#1565C0": "cobalt blue", "#0D47A1": "deep navy", "#FF6F00": "amber orange",
    // Avoid colors (appear in style.avoid palettes but not primary/accent)
    "#FF0000": "pure red", "#FFD700": "bright gold", "#00FF00": "neon green",
    "#FF69B4": "hot pink", "#FF1493": "deep pink", "#FF6347": "tomato red",
    "#E1BEE7": "lavender", "#B2DFDB": "pale mint", "#CFD8DC": "cool grey",
  };

  // Resolve all palette entries to readable names
  const resolvePaletteColor = (hex: string): string => HEX_NAMES[hex] || hex;

  const primaryColors = style.colorPalette.primary
    .slice(0, 3)
    .map(resolvePaletteColor)
    .join(", ");
  const accentColors = style.colorPalette.accent
    .slice(0, 2)
    .map(resolvePaletteColor)
    .join(" and ");
  const avoidColors = style.colorPalette.avoid
    .slice(0, 2)
    .map(resolvePaletteColor)
    .join(", ");

  // Materials — clean up hyphenated slugs to readable phrases
  const materialNames = style.materials
    .slice(0, 5)
    .map((m) => m.replace(/-/g, " "))
    .join(", ");

  // Furniture characteristics — directly describe visual properties
  const fc = style.furnitureCharacteristics || {};
  const furnitureCues = [
    fc.profile ? `${fc.profile} profile` : null,
    fc.legs ? `${fc.legs} legs` : null,
    fc.surfaces ? `${fc.surfaces} surfaces` : null,
    fc.lines ? `${fc.lines} lines` : null,
    fc.ornamentation && fc.ornamentation !== "none" ? fc.ornamentation : null,
  ]
    .filter(Boolean)
    .join(", ");

  const roomDesc = spaceAnalysis.roomType.replace(/_/g, " ");
  const prompt = [
    // Style trigger — most important, placed first so diffusion model latches on first
    styleTriggers,
    `professional interior design photograph of a ${roomDesc}`,
    `wide-angle shot from the room entrance looking inward`,
    `${spaceAnalysis.estimatedAreaSqm.toFixed(0)} square meter room`,
    // Products
    `furniture: ${furnitureDescriptions}`,
    // Style-specific furniture visual properties
    furnitureCues ? `furniture style: ${furnitureCues}` : null,
    // Color palette — explicit and comprehensive
    `wall and textile colors: ${primaryColors}`,
    `accent colors: ${accentColors}`,
    // Materials
    `materials and textures: ${materialNames}`,
    // Lighting
    style.lightingPreference || "warm afternoon natural lighting from windows",
    // Photo quality
    "photorealistic, magazine quality, professional staging, 8k resolution, architectural photography",
    // Negative guidance
    avoidColors ? `avoid colors: ${avoidColors}` : null,
  ]
    .filter(Boolean)
    .join(", ") + ", no people, no text, no watermarks, no logos";

  console.log("[viz] Prompt:", prompt.slice(0, 200));

  try {
    const encoded = encodeURIComponent(prompt);
    const seed = Math.abs(prompt.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % 100000;
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encoded}?width=1344&height=768&model=flux&seed=${seed}&nologo=true`;

    // Pre-fetch server-side: Pollinations returns 200 with empty body while generating.
    // We must wait for actual image bytes before returning.
    const maxAttempts = 4;
    const delayMs = 8000; // 8 seconds between retries

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`[viz] Attempt ${attempt}/${maxAttempts} fetching Pollinations image...`);
      try {
        const res = await withTimeout(fetch(pollinationsUrl), 30_000, `Pollinations fetch (attempt ${attempt})`);
        const buf = await withTimeout(res.arrayBuffer(), 15_000, "Pollinations read");

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
      } catch (fetchErr) {
        console.warn(`[viz] Attempt ${attempt} fetch error:`, fetchErr instanceof Error ? fetchErr.message : fetchErr);
      }
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

    const result = await withTimeout(
      model.generateContent(prompt),
      30_000,
      "Design explanation"
    );
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

  // Stage 1: Analyze space (has internal fallback — safe)
  console.log(`[pipeline:${projectId}] Stage 1: Analyzing space...`);
  const spaceAnalysis = await analyzeSpace(
    params.roomImageUrl,
    params.roomType,
    params.dimensions
  );

  // Stage 2 + 3: Filter & select products (may throw if catalog is empty)
  let selectedProducts: SelectedProduct[];
  try {
    console.log(`[pipeline:${projectId}] Stage 2-3: Selecting products...`);
    selectedProducts = await selectProducts(
      spaceAnalysis,
      params.styleSlug,
      params.budgetAed,
      params.additionalRequirements
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[pipeline:${projectId}] Product selection failed:`, msg);
    // Retry without user requirements — style categories only
    try {
      selectedProducts = await selectProducts(
        spaceAnalysis,
        params.styleSlug,
        params.budgetAed,
        null
      );
    } catch (retryErr) {
      // Both attempts failed — save partial results and throw descriptive error
      const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
      db.prepare(
        `UPDATE design_projects SET status = 'failed', space_analysis = ?,
         updated_at = datetime('now') WHERE id = ?`
      ).run(JSON.stringify(spaceAnalysis), projectId);
      throw new Error(`Product selection failed after retry: ${retryMsg}`);
    }
  }

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

  // Save intermediate results immediately (products selected — visible to user even if viz fails)
  const totalCostAed = enriched.reduce(
    (sum, sp) => sum + ((sp.product as unknown as Record<string, number>).price_aed || 0),
    0
  );
  db.prepare(
    `UPDATE design_projects SET
       space_analysis = ?,
       selected_products = ?,
       total_cost_aed = ?,
       updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    JSON.stringify(spaceAnalysis),
    JSON.stringify(selectedProducts),
    totalCostAed,
    projectId
  );

  // Stage 4 + 5: Visualization and Explanation are independent — run in parallel
  // Each has internal error handling (returns null / fallback string), but we
  // also wrap in try/catch so a crash in one doesn't lose the other.
  console.log(`[pipeline:${projectId}] Stage 4-5: Generating visualization + explanation...`);
  let visualizationUrl: string | null = null;
  let explanation = "Your personalized design has been created with carefully selected pieces.";
  try {
    const results = await Promise.allSettled([
      generateVisualization(spaceAnalysis, enriched, params.styleSlug),
      generateExplanation(spaceAnalysis, enriched, params.styleSlug, totalCostAed, params.budgetAed),
    ]);
    if (results[0].status === "fulfilled") visualizationUrl = results[0].value;
    else console.error(`[pipeline:${projectId}] Visualization rejected:`, results[0].reason);
    if (results[1].status === "fulfilled") explanation = results[1].value;
    else console.error(`[pipeline:${projectId}] Explanation rejected:`, results[1].reason);
  } catch (stage45Err) {
    console.error(`[pipeline:${projectId}] Stage 4-5 error:`, stage45Err);
    // Continue with whatever we got — partial results are better than a 500
  }

  // Save final results
  db.prepare(
    `UPDATE design_projects SET
       status = 'completed',
       visualization_url = ?,
       design_explanation = ?,
       updated_at = datetime('now')
     WHERE id = ?`
  ).run(visualizationUrl, explanation, projectId);

  return {
    spaceAnalysis,
    selectedProducts,
    visualizationUrl,
    explanation,
    totalCostAed,
  };
}
