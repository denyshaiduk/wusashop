'use strict';

const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'wusashop.sqlite'));
db.exec('PRAGMA journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL,
    category     TEXT NOT NULL DEFAULT '',
    description  TEXT NOT NULL DEFAULT '',
    price        INTEGER NOT NULL,       -- ціна в копійках/грн (цілі гривні)
    old_price    INTEGER,
    image        TEXT NOT NULL DEFAULT '',
    images       TEXT NOT NULL DEFAULT '[]', -- JSON-масив шляхів до додаткових фото товару
    status       TEXT NOT NULL DEFAULT 'in_stock', -- in_stock | on_order | out_of_stock
    craft_time   TEXT NOT NULL DEFAULT '',
    is_hit       INTEGER NOT NULL DEFAULT 0,
    sort_order   INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name  TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    city           TEXT NOT NULL DEFAULT '',
    warehouse      TEXT NOT NULL DEFAULT '',
    payment_method TEXT NOT NULL DEFAULT 'cod', -- prepay | full | cod
    payment_status TEXT NOT NULL DEFAULT 'pending', -- pending | paid | failed
    order_status   TEXT NOT NULL DEFAULT 'new', -- new | processing | shipped | done | cancelled
    total          INTEGER NOT NULL DEFAULT 0,
    prepay_amount   INTEGER,
    items_json      TEXT NOT NULL DEFAULT '[]',
    liqpay_order_id TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// М'яка міграція для БД, створених до появи поля prepay_amount
try { db.exec('ALTER TABLE orders ADD COLUMN prepay_amount INTEGER'); } catch { /* уже існує */ }
try { db.exec('ALTER TABLE orders ADD COLUMN receipt_path TEXT'); } catch { /* уже існує */ }
// М'яка міграція для БД, створених до появи галереї фото (кілька фото на товар)
try { db.exec("ALTER TABLE products ADD COLUMN images TEXT NOT NULL DEFAULT '[]'"); } catch { /* уже існує */ }

module.exports = db;
