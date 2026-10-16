import { normalizePhone } from "@/lib/phone";
import type { Item, RawItem } from "@/lib/schema";

export function parseHeader(transcript: string): {
  phone: string | null;
  chatName: string | null;
} {
  const first = transcript.split("\n").find((l) => l.trim().length > 0) ?? "";
  const match = first.match(/^HEADER:\s*(.*)$/i);
  const raw = (match?.[1] ?? "").trim();
  if (!raw || raw.toUpperCase() === "NONE") {
    return { phone: null, chatName: null };
  }
  const phone = normalizePhone(raw);
  return phone ? { phone, chatName: null } : { phone: null, chatName: raw };
}

export function toItems(raw: RawItem[]): Item[] {
  return raw.map((i) => ({
    name: i.name,
    qty: i.qty,
    price: i.qty > 0 ? Math.round((i.line_total / i.qty) * 100) / 100 : 0,
  }));
}

type Checkable = {
  phone: string | null;
  chat_name: string | null;
  items: Item[];
  total: number;
};

export function validateOrder(o: Checkable): string[] {
  const errors: string[] = [];
  if (!o.phone && !o.chat_name) errors.push("No phone or chat name");
  if (o.items.length === 0) errors.push("No items");
  if (!(o.total > 0)) errors.push("Total must be above 0");
  if (o.items.length > 0) {
    const sum = Math.round(o.items.reduce((s, i) => s + i.qty * i.price, 0));
    if (Math.abs(sum - o.total) > 1) {
      errors.push(`Items add up to ${sum}, total says ${o.total}`);
    }
  }
  return errors;
}
