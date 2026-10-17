import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { recordPayment } from "@/lib/report";

export const runtime = "nodejs";

const Body = z
  .object({
    mark_paid: z.literal(true).optional(),
    payment: z.number().positive().optional(),
  })
  .refine((b) => (b.mark_paid ? 1 : 0) + (b.payment ? 1 : 0) === 1, {
    message: "Send mark_paid or payment",
  });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId < 1) {
    return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payment" }, { status: 400 });
  }

  try {
    const result = recordPayment(
      orderId,
      parsed.data.mark_paid ? "full" : (parsed.data.payment as number),
    );
    if (!result) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Could not record payment" },
      { status: 500 },
    );
  }
}
