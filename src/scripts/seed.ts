/**
 * Seed script — run with: npx tsx src/scripts/seed.ts
 * Reads product-research.json and seeds the SQLite database.
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
  main_image_url: string;
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

function main() {
  console.log("Seeding database...\n");

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

  const insertProduct = db.prepare(`
    INSERT OR IGNORE INTO products
      (id, name, company_id, sku, category, subcategory, price_aed, original_price_aed,
       currency, product_url, affiliate_url, main_image_url, gallery_urls,
       length_cm, width_cm, height_cm, materials, colors, description,
       style_tags, room_types, min_room_area_sqm, price_tier,
       is_available, is_featured, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
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
        p.main_image_url,
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
        1, // is_available
        0  // is_featured
      );
      inserted++;
    }
  });

  transaction();

  console.log(`\n  Products: ${inserted} inserted, ${skipped} skipped`);

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
