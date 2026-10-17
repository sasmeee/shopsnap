import { NextRequest, NextResponse } from "next/server";
import { getReport } from "@/lib/report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Pick a valid date" }, { status: 400 });
  }
  return NextResponse.json(getReport(date));
}
