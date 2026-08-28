import OpenAI from "openai";
import db from "@/lib/db";
import { getStyleBySlug } from "@/lib/styles";
import { generateId } from "@/lib/utils";
import type {
  SpaceAnalysis,
  SelectedProduct,
  Product,
  RoomType,
} from "@/lib/types";
import { readFileSync, existsSync } from "fs";
import path from "path";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Converts an imageUrl to a form GPT-4o vision can accept.
 * - External https:// URLs are passed directly.
 * - Local /uploads/... paths are read from disk and base64-encoded.
 * - data:... base64 URLs are passed directly.
 * Returns null if the image is unusable.
 */
function resolveImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("data:")) return imageUrl;
  if (imageUrl.startsWith("https://")) return imageUrl;
  // Local path (e.g. /uploads/abc.jpg)
  if (imageUrl.startsWith("/uploads/") || imageUrl.startsWith("/public/")) {
    try {
      const filePath = path.join(process.cwd(), "public", imageUrl.startsWith("/public") ? imageUrl.slice(8) : imageUrl);
      if (!existsSync(filePath)) return null;
      const buf = readFileSync(filePath);
      const ext = path.extname(filePath).slice(1).toLowerCase();
      const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
      return `data:${mime};base64,${buf.toString("base64")}`;
    } catch {
      return null;
    }
  }
  return null;
}

// ================================================================
// STAGE 1: Space Analysis
// ================================================================
export async function analyzeSpace(
  imageUrl: string | null | undefined,
  roomType: RoomType,
  dimensions: { length: number; width: number; height?: number }
): Promise<SpaceAnalysis> {
  const areaSqm = (dimensions.length / 100) * (dimensions.width / 100);
  const resolvedUrl = resolveImageUrl(imageUrl);

  // If no usable image, skip vision and return dimension-based analysis
  if (!resolvedUrl) {
    console.log("No usable image URL — using dimension-based analysis");
    return buildFallbackAnalysis(roomType, dimensions, areaSqm);
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert interior design analyst. Analyze the room photo and return a structured JSON analysis.
The room type is: ${roomType}
Dimensions: ${dimensions.length}cm x ${dimensions.width}cm${dimensions.height ? ` x ${dimensions.height}cm` : ""}
Calculated area: ${areaSqm.toFixed(1)} sqm

Return ONLY valid JSON with this exact structure:
{
  "shape": "rectangular|square|l-shaped|irregular",
  "walls": [{"id":"w1","lengthM":4.5,"hasWindow":true,"windowWidthM":1.8,"hasDoor":false,"doorWidthM":null}],
  "existing_furniture": [{"type":"bed","approximateSize":"queen","position":"center-wall"}],
  "floor_type": "hardwood|tile|carpet|marble|laminate|concrete",
  "lighting": "natural-good|natural-poor|artificial-only|mixed",
  "available_wall_space_sqm": 12.0,
  "constraints": ["radiator-on-wall-2"]
}

Estimate wall lengths based on the provided dimensions. Be realistic about windows, doors, and existing furniture.`,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: resolvedUrl, detail: "high" },
            },
            {
              type: "text",
              text: "Analyze this room for interior design planning.",
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No AI response");

    const parsed = JSON.parse(content);
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
function filterProducts(
  styleSlug: string,
  roomType: string,
  budgetAed: number,
  requiredCategories: string[]
): Product[] {
  // Get all available products from enabled companies
  const rows = db
    .prepare(
      `SELECT p.*, c.name as company_name FROM products p
       JOIN companies c ON p.company_id = c.id
       WHERE p.is_available = 1 AND c.enabled = 1
       ORDER BY p.is_featured DESC, p.price_aed ASC`
    )
    .all() as (Product & { company_name: string })[];

  return rows.filter((p) => {
    // Style compatibility
    const tags = typeof p.styleTags === "string" ? JSON.parse(p.styleTags as unknown as string) : p.styleTags;
    const styleTags: string[] = Array.isArray(tags) ? tags : [];
    const matchesStyle =
      styleTags.length === 0 ||
      styleTags.some(
        (tag: string) => tag.toLowerCase() === styleSlug.toLowerCase()
      );

    // Room type compatibility
    const rTypes = typeof p.roomTypes === "string" ? JSON.parse(p.roomTypes as unknown as string) : p.roomTypes;
    const roomTypes: string[] = Array.isArray(rTypes) ? rTypes : [];
    const matchesRoom =
      roomTypes.length === 0 || roomTypes.includes(roomType);

    // Budget: individual item should not exceed 60% of total budget
    const maxItemPrice = budgetAed * 0.6;
    const withinBudget = p.priceAed <= maxItemPrice;

    // Category relevance (soft filter - include all if categories don't match)
    const matchesCategory =
      requiredCategories.length === 0 ||
      requiredCategories.some(
        (cat) =>
          p.subcategory.toLowerCase().includes(cat.toLowerCase()) ||
          cat.toLowerCase().includes(p.subcategory.toLowerCase())
      );

    return matchesStyle && matchesRoom && withinBudget;
  });
}

// ================================================================
// STAGE 3: AI Product Selection
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

  // Pre-filter products
  const candidates = filterProducts(
    styleSlug,
    spaceAnalysis.roomType,
    budgetAed,
    requiredCategories
  );

  if (candidates.length === 0) {
    throw new Error("No matching products found in catalog");
  }

  // Build product summary for AI
  const productSummary = candidates.map((p, i) => ({
    index: i + 1,
    id: p.id,
    name: p.name,
    subcategory: p.subcategory,
    price_aed: p.priceAed,
    colors: typeof p.colors === "string" ? JSON.parse(p.colors as unknown as string) : p.colors,
    materials: p.materials,
    dimensions: p.lengthCm
      ? `${p.lengthCm}x${p.widthCm}x${p.heightCm}cm`
      : "not specified",
    style_tags: typeof p.styleTags === "string" ? JSON.parse(p.styleTags as unknown as string) : p.styleTags,
  }));

  const prompt = `You are an expert interior designer AI. Select furniture for a room.

ROOM ANALYSIS:
- Type: ${spaceAnalysis.roomType}
- Area: ${spaceAnalysis.estimatedAreaSqm.toFixed(1)} sqm
- Shape: ${spaceAnalysis.shape}
- Floor: ${spaceAnalysis.floorType}
- Lighting: ${spaceAnalysis.lighting}
- Available wall space: ${spaceAnalysis.availableWallSpaceSqm.toFixed(1)} sqm
- Existing furniture: ${JSON.stringify(spaceAnalysis.existingFurniture)}

STYLE: ${style.name}
Style characteristics: ${JSON.stringify(style.furnitureCharacteristics)}
Preferred materials: ${style.materials.join(", ")}
Preferred colors: ${style.colorPalette.primary.join(", ")}, ${style.colorPalette.accent.join(", ")}
Lighting: ${style.lightingPreference}

BUDGET: AED ${budgetAed} total (you must stay within this)

REQUIRED CATEGORIES: ${requiredCategories.join(", ")}
${additionalRequirements ? `\nUSER REQUIREMENTS: ${additionalRequirements}` : ""}

AVAILABLE PRODUCTS (${productSummary.length} candidates):
${JSON.stringify(productSummary, null, 2)}

Select 6-10 products that:
1. Cover all required categories
2. Stay within budget (total must not exceed AED ${budgetAed})
3. Match the ${style.name} style
4. Have color harmony with each other
5. Have compatible materials
6. Fit the room dimensions
7. Consider any existing furniture

Return ONLY valid JSON:
{
  "selected": [
    {
      "product_id": "exact product id from the list",
      "category": "the category this fills",
      "reason": "brief reason why this product was selected"
    }
  ],
  "total_cost_aed": 1234
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "You are a professional interior designer. You select real products from a catalog based on room analysis and style requirements. Always return valid JSON.",
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    max_tokens: 4000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No AI response for product selection");

  const result = JSON.parse(content);
  const selected: SelectedProduct[] = [];
  const validIds = new Set(candidates.map((c) => c.id));

  for (const item of result.selected || []) {
    // CRITICAL: Validate that the product ID exists in our catalog
    if (validIds.has(item.product_id)) {
      selected.push({
        productId: item.product_id,
        reason: item.reason || "Selected for this room design",
        category: item.category || "general",
      });
    }
  }

  if (selected.length === 0) {
    throw new Error("AI selected no valid products");
  }

  return selected;
}

// ================================================================
// STAGE 4: Visualization
// ================================================================
export async function generateVisualization(
  spaceAnalysis: SpaceAnalysis,
  selectedProducts: (SelectedProduct & { product: Product })[],
  styleSlug: string
): Promise<string | null> {
  const style = getStyleBySlug(styleSlug);
  if (!style) return null;

  // Build product descriptions for the image prompt
  const furnitureDesc = selectedProducts
    .map((sp) => {
      const p = sp.product;
      const colors = typeof p.colors === "string" ? JSON.parse(p.colors as unknown as string) : p.colors;
      return `- ${p.name}: ${p.subcategory}, ${Array.isArray(colors) ? colors.join("/") : "neutral"} color, ${p.materials || "quality materials"}`;
    })
    .join("\n");

  const prompt = `Professional interior design photograph of a ${spaceAnalysis.roomType.replace("_", " ")} in ${style.name} style.

Room: ${spaceAnalysis.estimatedAreaSqm.toFixed(0)} square meters, ${spaceAnalysis.shape} shape, ${spaceAnalysis.floorType} flooring, ${spaceAnalysis.lighting} lighting.

Style: ${style.name} — ${style.description}
Color palette: ${style.colorPalette.primary.join(", ")} with ${style.colorPalette.accent.join(", ")} accents.

Furniture in the room:
${furnitureDesc}

The room should look:
- Photorealistic and professionally staged
- Well-lit with ${style.lightingPreference}
- Clean and uncluttered following ${style.name} principles
- All furniture proportionally correct and realistically placed
- Magazine-quality interior photography

Do NOT include any text, watermarks, or labels in the image.`;

  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1792x1024",
      quality: "hd",
    });

    const imageUrl = response.data?.[0]?.url || null;
    return imageUrl;
  } catch (error) {
    console.error("Visualization generation error:", error);
    return null;
  }
}

// ================================================================
// STAGE 5: Design Explanation
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
      (sp) =>
        `- ${sp.product.name} (${sp.product.subcategory}) — AED ${sp.product.priceAed}: ${sp.reason}`
    )
    .join("\n");

  const prompt = `Write a brief, elegant design explanation for this interior design project.

Room: ${spaceAnalysis.roomType.replace("_", " ")}, ${spaceAnalysis.estimatedAreaSqm.toFixed(1)} sqm
Style: ${style?.name || styleSlug}
Total cost: AED ${totalCost} (budget was AED ${budget})

Selected products:
${productList}

Write 3-4 paragraphs explaining:
1. The overall design concept and how the ${style?.name || ""} style was applied
2. Key furniture selections and why they work together
3. Color harmony and material choices
4. How the design optimizes the available space

Keep it professional but accessible. Write in a way that makes the client feel excited about their new room.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1000,
  });

  return (
    response.choices[0]?.message?.content ||
    "Your personalized design has been created with carefully selected pieces from our approved catalog."
  );
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

  // Update status: analyzing
  db.prepare(
    "UPDATE design_projects SET status = 'processing', updated_at = datetime('now') WHERE id = ?"
  ).run(projectId);

  // Step 1: Analyze space
  // Pass the user's image directly — resolveImageUrl() inside analyzeSpace handles
  // local paths (reads from disk) and falls back to dimension-based analysis if none.
  const spaceAnalysis = await analyzeSpace(
    params.roomImageUrl,
    params.roomType,
    params.dimensions
  );

  // Step 2: Select products
  const selectedProducts = await selectProducts(
    spaceAnalysis,
    params.styleSlug,
    params.budgetAed,
    params.additionalRequirements
  );

  // Step 3: Enrich with full product data
  const enriched = selectedProducts
    .map((sp) => {
      const product = db
        .prepare("SELECT * FROM products WHERE id = ?")
        .get(sp.productId) as Product | undefined;
      return product ? { ...sp, product } : null;
    })
    .filter(Boolean) as (SelectedProduct & { product: Product })[];

  // Step 4: Generate visualization
  const visualizationUrl = await generateVisualization(
    spaceAnalysis,
    enriched,
    params.styleSlug
  );

  // Step 5: Calculate total cost
  const totalCostAed = enriched.reduce(
    (sum, sp) => sum + sp.product.priceAed,
    0
  );

  // Step 6: Generate explanation
  const explanation = await generateExplanation(
    spaceAnalysis,
    enriched,
    params.styleSlug,
    totalCostAed,
    params.budgetAed
  );

  // Step 7: Save results
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
