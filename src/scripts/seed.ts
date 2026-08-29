/**
 * Seed script — run with: npx tsx src/scripts/seed.ts
 * Reads product-research.json and seeds the SQLite database.
 * Generates Pollinations.ai image URLs for products without images.
 */
import db from "../lib/db";
import { generateId, slugify } from "../lib/utils";
import researchData from "../data/product-research.json";
import bcrypt from "bcryptjs";

interface RawProduct {
  product_name: string;
  company: string;
  sku?: string;
  category: string;
  subcategory: string;
  price_aed: number;
  original_price_aed?: number;
  discount_percent?: number;
  product_url: string;
  main_image_url: string | null;
  dimensions?: {
    length_cm?: number;
    width_cm?: number;
    height_cm?: number;
    mattress_size?: string;
  };
  materials?: string;
  colors?: string[];
  description?: string;
  style_tags?: string[];
  data_source?: string;
}

function inferRoomTypes(subcategory: string): string[] {
  const bed = ["beds", "nightstands"];
  const living = ["sofas", "coffee-tables", "coffee_tables", "tv-units", "tv_units"];
  const dining = ["dining-tables", "dining_tables", "chairs"];
  const office = ["desks", "office-chairs", "office_chairs", "bookcases", "shelving"];
  const all = ["rugs", "floor-lamps", "floor_lamps", "table-lamps", "table_lamps",
    "pendant-lights", "pendant_lights", "lighting", "mirrors", "decor",
    "vases", "cushions", "storage", "dressers"];

  const sub = subcategory.toLowerCase().replace(/\s+/g, "-");
  const rooms: string[] = [];
  if (bed.includes(sub)) rooms.push("bedroom");
  if (living.includes(sub)) rooms.push("living_room");
  if (dining.includes(sub)) rooms.push("dining_room");
  if (office.includes(sub)) rooms.push("office");
  if (all.includes(sub)) rooms.push("bedroom", "living_room", "office");
  if (rooms.length === 0) rooms.push("bedroom", "living_room");
  return [...new Set(rooms)];
}

function inferPriceTier(price: number): "economy" | "moderate" | "premium" {
  if (price < 500) return "economy";
  if (price < 2000) return "moderate";
  return "premium";
}

/**
 * Generate a deterministic Pollinations.ai image URL for products
 * without a main_image_url (typically Home Centre / PAN Emirates products
 * whose Cloudflare protection blocks direct image scraping).
 * Uses a stable seed so the same product always gets the same image.
 */
function generateImageUrl(productName: string, subcategory: string): string {
  const prompts: Record<string, string> = {
    beds: "minimalist wooden bed frame with white linen bedding in bright clean bedroom",
    nightstands: "minimalist wooden nightstand bedside table with small lamp in clean bedroom",
    sofas: "modern minimalist fabric sofa with neutral cushions in bright clean living room",
    chairs: "minimalist upholstered accent chair in neutral tones in bright clean room",
    "coffee-tables": "minimalist wooden coffee table in bright clean modern living room",
    "tv-units": "minimalist low profile wooden TV console unit in clean modern living room",
    "dining-tables": "minimalist wooden dining table with chairs in bright clean dining room",
    desks: "minimalist wooden writing desk with chair in bright clean home office",
    shelving: "minimalist wooden open bookshelf with decor items in clean modern room",
    "floor-lamps": "minimalist modern floor lamp with fabric shade in bright clean room",
    "table-lamps": "minimalist ceramic table lamp with linen shade on wooden surface",
    "pendant-lights": "minimalist modern pendant light fixture in bright clean room",
    rugs: "neutral colored flatweave area rug on wooden floor in minimalist room",
    storage: "minimalist wooden storage chest of drawers in bright clean bedroom",
    dressers: "minimalist wooden dresser with mirror in bright clean bedroom",
    mirrors: "large minimalist floor mirror leaning against white wall in bright room",
    lighting: "minimalist modern light fixture in bright clean room",
  };

  const sub = subcategory.toLowerCase().replace(/\s+/g, "-");
  const prompt = prompts[sub] || "minimalist furniture piece in bright clean modern room";

  // Stable seed from product name (same product = same image)
  let hash = 0;
  for (let i = 0; i < productName.length; i++) {
    hash = ((hash << 5) - hash + productName.charCodeAt(i)) | 0;
  }
  const seed = Math.abs(hash);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=400&height=400&seed=${seed}&nologo=true`;
}

function main() {
  console.log("Seeding database...\n");

  // ---------- Drop & recreate products for clean schema ----------
  db.exec("DROP TABLE IF EXISTS products");

  // Re-run schema creation (db.ts already creates tables on import,
  // but we just dropped products — recreate with latest schema)
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      company_id TEXT NOT NULL REFERENCES companies(id),
      sku TEXT,
      category TEXT NOT NULL,
      subcategory TEXT NOT NULL,
      price_aed REAL NOT NULL,
      original_price_aed REAL,
      currency TEXT NOT NULL DEFAULT 'AED',
      product_url TEXT NOT NULL,
      affiliate_url TEXT,
      main_image_url TEXT,
      gallery_urls TEXT DEFAULT '[]',
      length_cm REAL,
      width_cm REAL,
      height_cm REAL,
      materials TEXT,
      colors TEXT DEFAULT '[]',
      description TEXT,
      style_tags TEXT DEFAULT '[]',
      room_types TEXT DEFAULT '[]',
      min_room_area_sqm REAL,
      price_tier TEXT NOT NULL DEFAULT 'moderate',
      data_source TEXT DEFAULT 'direct_scrape',
      is_available INTEGER NOT NULL DEFAULT 1,
      is_featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category, subcategory);
    CREATE INDEX IF NOT EXISTS idx_products_style ON products(style_tags);
    CREATE INDEX IF NOT EXISTS idx_products_available ON products(is_available);
  `);

  // ---------- Companies ----------
  const companies = [
    { name: "Danube Home", slug: "danube-home", website: "https://danubehome.com" },
    { name: "Home Centre", slug: "home-centre", website: "https://www.homecentre.com/ae/" },
    { name: "PAN Emirates", slug: "pan-emirates", website: "https://www.panemirates.com" },
  ];

  const companyIds: Record<string, string> = {};

  for (const c of companies) {
    const existing = db
      .prepare("SELECT id FROM companies WHERE slug = ?")
      .get(c.slug) as { id: string } | undefined;

    if (existing) {
      companyIds[c.slug] = existing.id;
      console.log(`  Company "${c.name}" already exists (${existing.id})`);
    } else {
      const id = generateId();
      db.prepare(
        "INSERT INTO companies (id, name, slug, website, enabled) VALUES (?, ?, ?, ?, 1)"
      ).run(id, c.name, c.slug, c.website);
      companyIds[c.slug] = id;
      console.log(`  Created company "${c.name}" (${id})`);
    }
  }

  // ---------- Products ----------
  const products = researchData.products as RawProduct[];
  let inserted = 0;
  let skipped = 0;
  let imagesGenerated = 0;

  const insertProduct = db.prepare(`
    INSERT INTO products
      (id, name, company_id, sku, category, subcategory, price_aed, original_price_aed,
       currency, product_url, affiliate_url, main_image_url, gallery_urls,
       length_cm, width_cm, height_cm, materials, colors, description,
       style_tags, room_types, min_room_area_sqm, price_tier, data_source,
       is_available, is_featured, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  const transaction = db.transaction(() => {
    for (const p of products) {
      const companySlug = slugify(p.company);
      const companyId = companyIds[companySlug];
      if (!companyId) {
        console.log(`  SKIP: Unknown company "${p.company}" for "${p.product_name}"`);
        skipped++;
        continue;
      }

      const id = generateId();
      const subcategory = p.subcategory.toLowerCase().replace(/\s+/g, "-");
      const colors = JSON.stringify(p.colors || []);
      const styleTags = JSON.stringify(p.style_tags || ["minimalist", "japandi"]);
      const roomTypes = JSON.stringify(inferRoomTypes(subcategory));
      const galleryUrls = JSON.stringify([]);

      // Use real image URL if available, otherwise generate Pollinations URL
      let imageUrl = p.main_image_url;
      if (!imageUrl) {
        imageUrl = generateImageUrl(p.product_name, subcategory);
        imagesGenerated++;
      }

      insertProduct.run(
        id,
        p.product_name,
        companyId,
        p.sku || null,
        "furniture",
        subcategory,
        p.price_aed,
        p.original_price_aed || null,
        "AED",
        p.product_url,
        null, // affiliate_url
        imageUrl,
        galleryUrls,
        p.dimensions?.length_cm || null,
        p.dimensions?.width_cm || null,
        p.dimensions?.height_cm || null,
        p.materials || null,
        colors,
        p.description || null,
        styleTags,
        roomTypes,
        null, // min_room_area_sqm
        inferPriceTier(p.price_aed),
        p.data_source || "direct_scrape",
        1, // is_available
        0  // is_featured
      );
      inserted++;
    }
  });

  transaction();

  console.log(`\n  Products: ${inserted} inserted, ${skipped} skipped`);
  console.log(`  Pollinations images generated: ${imagesGenerated}`);

  // ---------- Admin user ----------
  const adminExists = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get("admin@ainterior.ae") as { id: string } | undefined;

  if (!adminExists) {
    const adminId = generateId();
    const hash = bcrypt.hashSync("admin123", 10);
    db.prepare(
      "INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)"
    ).run(adminId, "admin@ainterior.ae", hash, "AInterior Admin", "admin");
    console.log(`\n  Created admin user: admin@ainterior.ae / admin123`);
  } else {
    console.log(`  Admin user already exists`);
  }

  console.log("\nSeed complete!");
}

main();
