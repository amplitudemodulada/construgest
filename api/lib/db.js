const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace('sqlite:///', '')
  : '/tmp/construgest.db';

const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    hashed_password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'visualizador',
    is_active INTEGER NOT NULL DEFAULT 1,
    phone TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    icon TEXT DEFAULT 'box',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    barcode TEXT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    category_id INTEGER REFERENCES categories(id),
    unit TEXT NOT NULL DEFAULT 'UN',
    cost_price REAL NOT NULL DEFAULT 0,
    selling_price REAL NOT NULL DEFAULT 0,
    min_stock INTEGER NOT NULL DEFAULT 0,
    current_stock INTEGER NOT NULL DEFAULT 0,
    max_stock INTEGER NOT NULL DEFAULT 0,
    location TEXT,
    ncm_code TEXT,
    cest_code TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    user_id INTEGER REFERENCES users(id),
    movement_type TEXT NOT NULL CHECK(movement_type IN ('entrada','saida','ajuste')),
    quantity INTEGER NOT NULL,
    unit_price REAL,
    total_price REAL,
    reference_type TEXT,
    reference_id INTEGER,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_type TEXT NOT NULL DEFAULT 'pf',
    name TEXT NOT NULL,
    company_name TEXT,
    document TEXT,
    ie_rg TEXT,
    email TEXT,
    phone TEXT,
    cellphone TEXT,
    zip_code TEXT,
    address TEXT,
    number TEXT,
    complement TEXT,
    neighborhood TEXT,
    city TEXT DEFAULT 'São Paulo',
    state TEXT DEFAULT 'SP',
    notes TEXT,
    credit_limit REAL DEFAULT 0,
    birth_date TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL,
    trade_name TEXT,
    cnpj TEXT UNIQUE,
    ie TEXT,
    email TEXT,
    phone TEXT,
    cellphone TEXT,
    zip_code TEXT,
    address TEXT,
    number TEXT,
    complement TEXT,
    neighborhood TEXT,
    city TEXT DEFAULT 'São Paulo',
    state TEXT DEFAULT 'SP',
    notes TEXT,
    contact_name TEXT,
    contact_phone TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES customers(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    subtotal REAL NOT NULL DEFAULT 0,
    discount REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'dinheiro',
    installments INTEGER DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'concluida',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL REFERENCES sales(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL
  );
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER REFERENCES sales(id),
    purchase_id INTEGER REFERENCES purchases(id),
    type TEXT NOT NULL CHECK(type IN ('receber','pagar')),
    description TEXT,
    amount REAL NOT NULL,
    due_date TEXT NOT NULL,
    paid_date TEXT,
    status TEXT NOT NULL DEFAULT 'pendente',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT UNIQUE NOT NULL,
    supplier_id INTEGER REFERENCES suppliers(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    subtotal REAL NOT NULL DEFAULT 0,
    discount REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pendente',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS purchase_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id INTEGER NOT NULL REFERENCES purchases(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL
  );
  CREATE TABLE IF NOT EXISTS loyalty_programs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    points_per_real REAL NOT NULL DEFAULT 1,
    min_points_redeem INTEGER NOT NULL DEFAULT 100,
    points_per_reais REAL NOT NULL DEFAULT 0.05,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS loyalty_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    sale_id INTEGER REFERENCES sales(id),
    points INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('earn','redeem')),
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_number TEXT UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES customers(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    subtotal REAL NOT NULL DEFAULT 0,
    discount REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pendente',
    valid_until TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS quote_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_id INTEGER NOT NULL REFERENCES quotes(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL
  );
  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id INTEGER,
    details TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

module.exports = db;
module.exports.dbPath = DB_PATH;
