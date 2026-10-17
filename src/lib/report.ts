import { getDb, normName } from "@/lib/db";
import type { Item } from "@/lib/schema";

export type ReportOrder = {
  id: number;
  phone: string | null;
  name: string;
  order_date: string;
  items: Item[];
  total: number;
  paid_amount: number;
  balance: number;
  pay_status: "paid" | "unpaid" | "partial";
};

export type CustomerTotal = {
  key: string;
  label: string;
  phone: string | null;
  orders: number;
  total: number;
  paid: number;
  balance: number;
};

export type Report = {
  date: string;
  totals: { orders: number; sales: number; paid: number; unpaid: number };
  unpaid: ReportOrder[];
  customers: CustomerTotal[];
};

const money = (n: number) => Math.round(n * 100) / 100;

type Row = {
  id: number;
  phone: string | null;
  pending_name: string | null;
  nickname: string | null;
  order_date: string;
  items_json: string;
  total: number;
  paid_amount: number;
  pay_status: "paid" | "unpaid" | "partial";
};

export function getReport(date: string): Report {
  const rows = getDb()
    .prepare(
      `SELECT o.id, o.phone, o.pending_name, c.nickname, o.order_date,
              o.items_json, o.total, o.paid_amount, o.pay_status
       FROM orders o
       LEFT JOIN customers c ON c.phone = o.phone
       WHERE o.order_date = ?
       ORDER BY o.id`,
    )
    .all(date) as Row[];

  const orders: ReportOrder[] = rows.map((r) => ({
    id: r.id,
    phone: r.phone,
    name: r.nickname || r.pending_name || r.phone || "Unknown",
    order_date: r.order_date,
    items: JSON.parse(r.items_json) as Item[],
    total: r.total,
    paid_amount: r.paid_amount,
    balance: money(r.total - r.paid_amount),
    pay_status: r.pay_status,
  }));

  const sales = orders.reduce((s, o) => s + o.total, 0);
  const paid = orders.reduce((s, o) => s + o.paid_amount, 0);

  const map = new Map<string, CustomerTotal>();
  for (let i = 0; i < orders.length; i++) {
    const o = orders[i];
    const key = o.phone ?? `name:${normName(rows[i].pending_name ?? "")}`;
    const c = map.get(key) ?? {
      key,
      label: o.name,
      phone: o.phone,
      orders: 0,
      total: 0,
      paid: 0,
      balance: 0,
    };
    c.orders++;
    c.total = money(c.total + o.total);
    c.paid = money(c.paid + o.paid_amount);
    c.balance = money(c.balance + o.balance);
    map.set(key, c);
  }

  return {
    date,
    totals: {
      orders: orders.length,
      sales: money(sales),
      paid: money(paid),
      unpaid: money(sales - paid),
    },
    unpaid: orders.filter((o) => o.balance > 0),
    customers: [...map.values()].sort((a, b) => b.total - a.total),
  };
}

// record a payment for one order.
export function recordPayment(
  id: number,
  payment: number | "full",
): { paid_amount: number; pay_status: "paid" | "unpaid" | "partial" } | null {
  const db = getDb();
  const row = db
    .prepare("SELECT total, paid_amount FROM orders WHERE id = ?")
    .get(id) as { total: number; paid_amount: number } | undefined;
  if (!row) return null;

  const next =
    payment === "full"
      ? row.total
      : Math.min(row.total, money(row.paid_amount + payment));
  const status = next >= row.total ? "paid" : next > 0 ? "partial" : "unpaid";

  db.prepare(
    "UPDATE orders SET paid_amount = ?, pay_status = ? WHERE id = ?",
  ).run(next, status, id);
  return { paid_amount: next, pay_status: status };
}
