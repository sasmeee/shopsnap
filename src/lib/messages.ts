import type { Item } from "@/lib/schema";

export function formatRs(n: number): string {
  return `Rs ${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

// build a message the owner can paste into whatsapp.
export function followUpMessage(o: {
  name: string;
  order_date: string;
  items: Item[];
  balance: number;
}): string {
  const items = o.items.map((i) => `${i.qty} x ${i.name}`).join(", ");
  const hello = o.name.startsWith("+") ? "Hi" : `Hi ${o.name}`;
  return `${hello}, a quick reminder about your order on ${o.order_date} (${items}). Balance due: ${formatRs(o.balance)}. Please send the payment when you can. Thank you!`;
}
