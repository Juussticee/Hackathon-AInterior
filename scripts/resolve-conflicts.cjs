const fs = require("fs");
const path = require("path");

function resolveAiEngine(content) {
  // Conflict 1: keep upstream category code, drop stashed helpers
  const marker1Start = content.indexOf("  return found;\r\n=======");
  const marker1End = content.indexOf(">>>>>>> Stashed changes\r\n}", marker1Start) + ">>>>>>> Stashed changes\r\n}".length;
  if (marker1Start !== -1 && marker1End !== -1) {
    content = content.slice(0, marker1Start) + "  return found;\r\n}" + content.slice(marker1End);
  }

  // Conflict 2: filterProducts - keep upstream but add total-budget fallback
  const marker2Start = content.indexOf("<<<<<<< Updated upstream\r\n  // Normalize required categories");
  const marker2End = content.indexOf(">>>>>>> Stashed changes\r\n}", marker2Start) + ">>>>>>> Stashed changes\r\n}".length;
  if (marker2Start !== -1 && marker2End !== -1) {
    content = content.slice(0, marker2Start) + `  // Normalize required categories into all known DB subcategory variants
  const expandedCats = expandCategories(requiredCategories);
  const hasCatFilter = expandedCats.size > 0;

  // Helper: check if a product matches room + category filters
  const matchRoomCat = (p) => {
    let roomTypes = [];
    try { roomTypes = JSON.parse(p.room_types || "[]"); } catch { roomTypes = []; }
    const matchesRoom = roomTypes.length === 0 || roomTypes.includes(roomType);
    const sub = (p.subcategory || "").toLowerCase().replace(/\\s+/g, "-");
    const matchesCategory = !hasCatFilter || expandedCats.has(sub);
    return matchesRoom && matchesCategory;
  };

  // Helper: check if a product matches the style filter
  const matchStyle = (p) => {
    let styleTags = [];
    try { styleTags = JSON.parse(p.style_tags || "[]"); } catch { styleTags = []; }
    return (
      styleTags.length === 0 ||
      styleTags.some((tag) => tag.toLowerCase() === styleSlug.toLowerCase())
    );
  };

  // First attempt: style + room + category
  const strict = rows.filter((p) => matchStyle(p) && matchRoomCat(p));

  // Fallback 1: if style is too restrictive, relax the style filter but keep room + category
  if (strict.length < 5) {
    const relaxed = rows.filter(matchRoomCat);
    if (relaxed.length >= 5) {
      console.warn(
        \`[filterProducts] Style "\${styleSlug}" matched only \${strict.length} products, \` +
        \`falling back to room+category filter (\${relaxed.length} candidates)\`
      );
      return relaxed;
    }

    // Fallback 2: room has no tagged products (e.g. studio, kids_room)
    const noRoom = rows.filter((p) => {
      const sub = (p.subcategory || "").toLowerCase().replace(/\\s+/g, "-");
      const matchesCategory = !hasCatFilter || expandedCats.has(sub);
      return matchStyle(p) && matchesCategory;
    });
    if (noRoom.length >= 5) {
      console.warn(
        \`[filterProducts] Room "\${roomType}" has no tagged products, \` +
        \`falling back to style+category filter (\${noRoom.length} candidates)\`
      );
      return noRoom;
    }

    // Fallback 3: drop all filters except price — use entire catalog within 60% budget
    if (rows.length > 0) {
      console.warn(
        \`[filterProducts] All filters exhausted, returning full catalog (\${rows.length} candidates)\`
      );
      return rows;
    }
  }

  // Final fallback: widen SQL budget limit to total budget if 60% pool is empty
  if (rows.length === 0) {
    const budgetRows = db
      .prepare(
        \`SELECT p.*, c.name as company_name FROM products p
         JOIN companies c ON p.company_id = c.id
         WHERE p.is_available = 1 AND c.enabled = 1
           AND p.price_aed <= ?
         ORDER BY p.is_featured DESC, p.price_aed ASC\`
      )
      .all(budgetAed);
    if (budgetRows.length > 0) {
      console.warn(\`[filterProducts] No products under 60% budget, widening to total budget (\${budgetRows.length} candidates)\`);
      return budgetRows;
    }
  }

  return strict;
}` + content.slice(marker2End);
  }

  // Conflict 3: runDesignPipeline - insert curated reference before upstream selectProducts retry
  const marker3Start = content.indexOf("<<<<<<< Updated upstream\r\n  // Stage 2 + 3: Filter & select products (may throw if catalog is empty)");
  const marker3End = content.indexOf(">>>>>>> Stashed changes\r\n", marker3Start) + ">>>>>>> Stashed changes\r\n".length;
  if (marker3Start !== -1 && marker3End !== -1) {
    content = content.slice(0, marker3Start) + `  // Stage 1b: Use curated reference design if one exists and fits the budget
  const curated = findCuratedDesign(params.styleSlug, params.roomType);
  if (curated) {
    const curatedTotal = Number(curated.total_cost_aed || 0);
    if (curatedTotal <= params.budgetAed) {
      console.log(
        \`[runDesignPipeline] Using curated reference for \${params.styleSlug} \${params.roomType}\`
      );
      const curatedSelected = JSON.parse(
        (curated.selected_products) || "[]"
      );
      const curatedViz = (curated.visualization_url) || null;
      const curatedExplanation =
        (curated.design_explanation) ||
        "Your curated design has been assembled with hand-picked pieces from our approved UAE catalog.";

      db.prepare(
        \`UPDATE design_projects SET
           status = 'completed',
           space_analysis = ?,
           selected_products = ?,
           visualization_url = ?,
           design_explanation = ?,
           total_cost_aed = ?,
           updated_at = datetime('now')
         WHERE id = ?\`
      ).run(
        JSON.stringify(spaceAnalysis),
        JSON.stringify(curatedSelected),
        curatedViz,
        curatedExplanation,
        curatedTotal,
        projectId
      );

      return {
        spaceAnalysis,
        selectedProducts: curatedSelected,
        visualizationUrl: curatedViz,
        explanation: curatedExplanation,
        totalCostAed: curatedTotal,
      };
    }
  }

  // Stage 2 + 3: Filter & select products (may throw if catalog is empty)
  let selectedProducts;
  try {
    console.log(\`[pipeline:\${projectId}] Stage 2-3: Selecting products...\`);
    selectedProducts = await selectProducts(
      spaceAnalysis,
      params.styleSlug,
      params.budgetAed,
      params.additionalRequirements
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(\`[pipeline:\${projectId}] Product selection failed:\`, msg);
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
        \`UPDATE design_projects SET status = 'failed', space_analysis = ?,
         updated_at = datetime('now') WHERE id = ?\`
      ).run(JSON.stringify(spaceAnalysis), projectId);
      throw new Error(\`Product selection failed after retry: \${retryMsg}\`);
    }
  }
` + content.slice(marker3End);
  }

  return content;
}

function resolvePage(content) {
  // Conflict 1: imports - keep all
  const impStart = content.indexOf("<<<<<<< Updated upstream\r\n  Printer,");
  const impEnd = content.indexOf(">>>>>>> Stashed changes\r\n  X,\r\n}", impStart) + ">>>>>>> Stashed changes\r\n  X,\r\n}".length;
  if (impStart !== -1 && impEnd !== -1) {
    content = content.slice(0, impStart) + "  Printer,\r\n  Share2,\r\n  Link as LinkIcon,\r\n  Eye,\r\n  X,\r\n}" + content.slice(impEnd);
  }

  // Conflict 2: product card - keep both AI badge and Preview button
  const cardStart = content.indexOf("<<<<<<< Updated upstream\r\n                    {p.data_source === \"search_index\" && (");
  const cardEnd = content.indexOf(">>>>>>> Stashed changes\r\n                    <span className=\"absolute bottom-2 right-2", cardStart);
  const cardEndFull = content.indexOf(">", cardEnd) + 1;
  if (cardStart !== -1 && cardEnd !== -1) {
    content = content.slice(0, cardStart) + `                    {p.data_source === "search_index" && (
                      <span className="absolute top-2 right-2 bg-amber-400/90 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                        AI Image
                      </span>
                    )}
                    <button
                      onClick={() => {
                        setPreviewLoading(true);
                        setPreviewTab("product");
                        setPreviewUrl({
                          url: buildPreviewUrl(sp, design),
                          productName: p.name,
                          productUrl: p.product_url,
                          productImageUrl: p.main_image_url,
                        });
                      }}
                      className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-brand-700/90 hover:bg-brand-800 text-white text-[10px] font-semibold px-2.5 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 backdrop-blur-sm"
                    >
                      <Eye className="w-3 h-3" />
                      Preview in Room
                    </button>
` + content.slice(cardEndFull);
  }

  return content;
}

const aiPath = path.join(process.cwd(), "src/lib/ai-engine.ts");
const pagePath = path.join(process.cwd(), "src/app/design/[id]/page.tsx");

let aiContent = fs.readFileSync(aiPath, "utf8");
let pageContent = fs.readFileSync(pagePath, "utf8");

aiContent = resolveAiEngine(aiContent);
pageContent = resolvePage(pageContent);

fs.writeFileSync(aiPath, aiContent, "utf8");
fs.writeFileSync(pagePath, pageContent, "utf8");

console.log("Resolved conflicts in ai-engine.ts and page.tsx");
