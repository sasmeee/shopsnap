import { NextRequest, NextResponse } from "next/server";
import { searchCustomers } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  return NextResponse.json({ customers: searchCustomers(q) });
}
