import { NextResponse } from "next/server";
import { getPendingGroups } from "@/lib/db";

export function GET() {
  return NextResponse.json({ groups: getPendingGroups() });
}
