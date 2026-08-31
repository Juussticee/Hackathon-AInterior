import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Embedded pre-seeded DB — guaranteed to be in the serverless bundle
// because it's a .cjs module (traced by Next.js / @vercel/nft).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SEEDED_DB_BUFFER: Buffer = require("../data/seeded-db-buf.cjs");

/**
 * On Vercel (and other read-only-fs serverless platforms), the bundled DB
 * from the build step lives in the read-only deployment filesystem.
 * We copy it to /tmp (the only writable directory) so writes succeed.
 * Data won't persist across cold starts, but that's fine for a demo.
 */
const isVercel = !!process.env.VERCEL || !!process.env.VERCEL_ENV;
const BUNDLED_DB_PATH = path.join(process.cwd(), "data", "ainterior.db");
// Pre-seeded DB committed to repo for serverless deployments
const SEEDED_DB_PATH = path.join(process.cwd(), "src", "data", "seeded.db");

function resolveDbPath(): string {
  if (!isVercel) return BUNDLED_DB_PATH;

  const tmpDbPath = path.join("/tmp", "ainterior.db");
  try {
    if (!fs.existsSync(tmpDbPath)) {
      // On first cold start, copy the pre-seeded DB to writable /tmp
      const source = fs.existsSync(BUNDLED_DB_PATH) ? BUNDLED_DB_PATH : SEEDED_DB_PATH;
      if (fs.existsSync(source)) {
        fs.copyFileSync(source, tmpDbPath);
        for (const suffix of ["-wal", "-shm"]) {
          const src = source + suffix;
          if (fs.existsSync(src)) fs.copyFileSync(src, tmpDbPath + suffix);
        }
      } else if (SEEDED_DB_BUFFER && SEEDED_DB_BUFFER.length > 0) {
        // Final fallback: write the embedded base64 buffer to /tmp
        fs.writeFileSync(tmpDbPath, SEEDED_DB_BUFFER);
      }
    }
    return tmpDbPath;
  } catch {
    return BUNDLED_DB_PATH;
  }
}

const DB_PATH = resolveDbPath();

// Ensure data directory exists (local dev only)
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ---------- Schema ----------
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    website TEXT,
    logo_url TEXT,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

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

  CREATE TABLE IF NOT EXISTS design_projects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    title TEXT,
    room_type TEXT NOT NULL,
    room_image_url TEXT,
    room_length_cm REAL NOT NULL,
    room_width_cm REAL NOT NULL,
    room_height_cm REAL,
    existing_furniture TEXT,
    additional_requirements TEXT,
    style_slug TEXT NOT NULL,
    budget_aed REAL NOT NULL,
    budget_tier TEXT NOT NULL DEFAULT 'moderate',
    status TEXT NOT NULL DEFAULT 'draft',
    space_analysis TEXT,
    selected_products TEXT,
    visualization_url TEXT,
    design_explanation TEXT,
    total_cost_aed REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);
  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category, subcategory);
  CREATE INDEX IF NOT EXISTS idx_products_style ON products(style_tags);
  CREATE INDEX IF NOT EXISTS idx_products_available ON products(is_available);
  CREATE INDEX IF NOT EXISTS idx_designs_user ON design_projects(user_id);
`);

export default db;
