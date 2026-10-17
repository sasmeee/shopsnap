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

// make sure returned amounts appear in the transcript.
export function checkGrounded(
  transcript: string,
  o: { total: number; items: RawItem[] },
): string[] {
  const found = transcript.match(/\d[\d,]*(?:\.\d+)?/g) ?? [];
  const nums = new Set(found.map((n) => Number(n.replace(/,/g, ""))));
  const errors: string[] = [];

  const lineSum = o.items.reduce((s, i) => s + i.line_total, 0);
  const totalOk = nums.has(o.total) || Math.abs(lineSum - o.total) <= 1;
  if (o.total > 0 && !totalOk) {
    errors.push(`Total ${o.total} not found in chat text`);
  }
  for (const i of o.items) {
    if (i.line_total > 0 && !nums.has(i.line_total)) {
      errors.push(
        `Amount ${i.line_total} for ${i.name} not found in chat text`,
      );
    }
  }
  return errors;
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

type PayStatus = "paid" | "unpaid" | "partial" | "unknown";

// trust paid status only when the chat text supports it.
export function checkPayStatus(
  transcript: string,
  status: PayStatus,
): { status: PayStatus; warning?: string } {
  const text = transcript.toLowerCase();
  const unpaidWord =
    /\b(unpaid|not paid|passe|nathi|owe|owes|credit|later)\b/.test(text);
  const paidWord =
    /\b(paid|damma|dunna|bank|transfer|transferred|deposit|deposited)\b/.test(
      text.replace(/\b(unpaid|not paid)\b/g, ""),
    );

  if (status === "paid" && !paidWord) {
    return unpaidWord
      ? {
          status: "unpaid",
          warning: "Model said paid, but the chat says payment is pending",
        }
      : {
          status: "unknown",
          warning: "Model said paid, but no payment found in the chat",
        };
  }
  if (status === "unknown" && unpaidWord && !paidWord) {
    return { status: "unpaid" };
  }
  return { status };
}
