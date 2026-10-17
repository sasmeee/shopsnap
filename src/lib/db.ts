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

// Same rule everywhere: trim, lowercase, collapse spaces.
export function normName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
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

// True if any order from this screenshot is already saved.
export function hashExists(hash: string): boolean {
  const row = getDb()
    .prepare("SELECT 1 FROM orders WHERE source_hash = ? LIMIT 1")
    .get(hash);
  return row !== undefined;
}

export function findAlias(chatName: string): string | null {
  const row = getDb()
    .prepare("SELECT phone FROM customer_aliases WHERE chat_name = ?")
    .get(normName(chatName)) as { phone: string } | undefined;
  return row?.phone ?? null;
}

export type PendingGroup = {
  name: string;
  orders: number;
  total: number;
  balance: number;
  first_date: string;
  last_date: string;
};

export function getPendingGroups(): PendingGroup[] {
  const rows = getDb()
    .prepare(
      `SELECT pending_name, order_date, total, paid_amount
       FROM orders
       WHERE phone IS NULL AND pending_name IS NOT NULL
       ORDER BY id DESC`,
    )
    .all() as {
    pending_name: string;
    order_date: string;
    total: number;
    paid_amount: number;
  }[];

  const map = new Map<string, PendingGroup>();
  for (const r of rows) {
    const key = normName(r.pending_name);
    const grp = map.get(key) ?? {
      name: r.pending_name,
      orders: 0,
      total: 0,
      balance: 0,
      first_date: r.order_date,
      last_date: r.order_date,
    };
    grp.orders++;
    grp.total += r.total;
    grp.balance += r.total - r.paid_amount;
    if (r.order_date < grp.first_date) grp.first_date = r.order_date;
    if (r.order_date > grp.last_date) grp.last_date = r.order_date;
    map.set(key, grp);
  }
  return [...map.values()];
}

// Attach all pending orders with this name to a phone.
// Creates the customer if new and remembers name -> phone.
export function assignPending(name: string, phone: string): number {
  const db = getDb();
  const key = normName(name);
  const rows = db
    .prepare(
      "SELECT id, pending_name FROM orders WHERE phone IS NULL AND pending_name IS NOT NULL",
    )
    .all() as { id: number; pending_name: string }[];
  const ids = rows
    .filter((r) => normName(r.pending_name) === key)
    .map((r) => r.id);

  const run = db.transaction(() => {
    db.prepare(
      "INSERT OR IGNORE INTO customers (phone, nickname) VALUES (?, ?)",
    ).run(phone, name.trim());
    db.prepare(
      "INSERT OR REPLACE INTO customer_aliases (chat_name, phone) VALUES (?, ?)",
    ).run(key, phone);
    const update = db.prepare(
      "UPDATE orders SET phone = ?, pending_name = NULL WHERE id = ?",
    );
    for (const id of ids) update.run(phone, id);
  });
  run();

  return ids.length;
}

export type CustomerRow = {
  phone: string;
  nickname: string | null;
  aliases: string | null;
};

export function searchCustomers(q: string): CustomerRow[] {
  const term = q.trim().toLowerCase();
  return getDb()
    .prepare(
      `SELECT c.phone, c.nickname,
         (SELECT group_concat(a.chat_name, ', ')
            FROM customer_aliases a WHERE a.phone = c.phone) AS aliases
       FROM customers c
       WHERE @term = ''
          OR lower(c.phone) LIKE @like
          OR lower(coalesce(c.nickname, '')) LIKE @like
          OR EXISTS (SELECT 1 FROM customer_aliases a
                     WHERE a.phone = c.phone AND a.chat_name LIKE @like)
       ORDER BY c.created_at DESC, c.phone
       LIMIT 20`,
    )
    .all({ term, like: `%${term}%` }) as CustomerRow[];
}
