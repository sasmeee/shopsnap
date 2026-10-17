import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assignPending } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";

export const runtime = "nodejs";

const Body = z.object({
  pendingName: z.string().min(1),
  phone: z.string().min(1),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const phone = normalizePhone(parsed.data.phone);
  if (!phone) {
    return NextResponse.json(
      { error: "That phone number is not valid" },
      { status: 400 },
    );
  }

  try {
    const attached = assignPending(parsed.data.pendingName, phone);
    return NextResponse.json({ attached, phone });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Could not assign phone" },
      { status: 500 },
    );
  }
}
