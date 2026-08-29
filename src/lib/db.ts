import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "ainterior.db");

// Ensure data directory exists
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
