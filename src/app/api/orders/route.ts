import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { saveOrders, type NewOrder } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import { validateOrder } from "@/lib/chat";

export const runtime = "nodejs";

const ItemIn = z.object({
  name: z.string().min(1),
  qty: z.number().positive(),
  price: z.number().min(0),
});

const OrderIn = z.object({
  phone: z.string().nullable(),
  chat_name: z.string().nullable(),
  order_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z.array(ItemIn).min(1),
  total: z.number().positive(),
  pay_status: z.enum(["paid", "unpaid", "partial"]),
  paid_amount: z.number().min(0).default(0),
  source_hash: z.string().min(1),
  order_idx: z.number().int().min(0),
});

const Body = z.object({ orders: z.array(OrderIn).min(1) });

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid order data" }, { status: 400 });
  }

  const prepared: NewOrder[] = [];
  for (const o of parsed.data.orders) {
    const phone = o.phone ? normalizePhone(o.phone) : null;
    if (o.phone && !phone) {
      return NextResponse.json(
        { error: `Invalid phone number: ${o.phone}` },
        { status: 400 },
      );
    }
    const chat_name = o.chat_name?.trim() || null;

    const problems = validateOrder({
      phone,
      chat_name,
      items: o.items,
      total: o.total,
    });
    if (problems.length > 0) {
      return NextResponse.json({ error: problems[0] }, { status: 400 });
    }

    let paid_amount = 0;
    if (o.pay_status === "paid") paid_amount = o.total;
    if (o.pay_status === "partial") {
      if (!(o.paid_amount > 0 && o.paid_amount < o.total)) {
        return NextResponse.json(
          { error: "Partial payment must be above 0 and below the total" },
          { status: 400 },
        );
      }
      paid_amount = o.paid_amount;
    }

    prepared.push({
      phone,
      chat_name,
      order_date: o.order_date,
      items: o.items,
      total: o.total,
      paid_amount,
      pay_status: o.pay_status,
      source_hash: o.source_hash,
      order_idx: o.order_idx,
    });
  }

  try {
    return NextResponse.json(saveOrders(prepared));
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Could not save orders" },
      { status: 500 },
    );
  }
}
