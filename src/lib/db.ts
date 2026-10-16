import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DB_PATH =
  process.env.DB_PATH || path.join(process.cwd(), "data", "shopsnap.db");

function open(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      phone TEXT PRIMARY KEY,
      nickname TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS customer_aliases (
      chat_name TEXT PRIMARY KEY,
      phone TEXT NOT NULL REFERENCES customers(phone)
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT REFERENCES customers(phone),
      pending_name TEXT,
      order_date TEXT NOT NULL,
      items_json TEXT NOT NULL,
      total REAL NOT NULL,
      paid_amount REAL NOT NULL DEFAULT 0,
      pay_status TEXT NOT NULL,
      source_hash TEXT NOT NULL,
      order_idx INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(source_hash, order_idx)
    );
    CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);
    CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);
  `);
  return db;
}

// One connection, survives dev hot reload.
const g = globalThis as unknown as { __shopsnapDb?: Database.Database };

export function getDb(): Database.Database {
  if (!g.__shopsnapDb) g.__shopsnapDb = open();
  return g.__shopsnapDb;
}

export type NewOrder = {
  phone: string | null;
  chat_name: string | null;
  order_date: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
  paid_amount: number;
  pay_status: "paid" | "unpaid" | "partial";
  source_hash: string;
  order_idx: number;
};

export function saveOrders(orders: NewOrder[]): {
  saved: number;
  duplicates: number;
} {
  const db = getDb();
  const insertCustomer = db.prepare(
    "INSERT OR IGNORE INTO customers (phone) VALUES (?)",
  );
  const insertOrder = db.prepare(`
    INSERT OR IGNORE INTO orders
      (phone, pending_name, order_date, items_json, total, paid_amount, pay_status, source_hash, order_idx)
    VALUES
      (@phone, @pending_name, @order_date, @items_json, @total, @paid_amount, @pay_status, @source_hash, @order_idx)
  `);

  let saved = 0;
  let duplicates = 0;

  const run = db.transaction((list: NewOrder[]) => {
    for (const o of list) {
      if (o.phone) insertCustomer.run(o.phone);
      const res = insertOrder.run({
        phone: o.phone,
        pending_name: o.phone ? null : o.chat_name,
        order_date: o.order_date,
        items_json: JSON.stringify(o.items),
        total: o.total,
        paid_amount: o.paid_amount,
        pay_status: o.pay_status,
        source_hash: o.source_hash,
        order_idx: o.order_idx,
      });
      if (res.changes > 0) saved++;
      else duplicates++;
    }
  });
  run(orders);

  return { saved, duplicates };
}
