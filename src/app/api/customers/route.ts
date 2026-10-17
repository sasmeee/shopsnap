import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listCustomers, updateNickname } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  return NextResponse.json({ customers: listCustomers(q) });
}

const Patch = z.object({
  phone: z.string().min(1),
  nickname: z.string().max(60).nullable(),
});

export async function PATCH(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = Patch.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const nickname = parsed.data.nickname?.trim() || null;
  if (!updateNickname(parsed.data.phone, nickname)) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
