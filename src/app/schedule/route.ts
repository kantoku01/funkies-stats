import { NextResponse, type NextRequest } from "next/server";
import { monthKey } from "@/lib/schedule/month";
import { todayInJapan } from "@/lib/season";

// /schedule は今月(日本時間)の予定・出欠ページへ
export function GET(request: NextRequest) {
  const [y, m] = todayInJapan(new Date()).split("-").map(Number);
  return NextResponse.redirect(new URL(`/schedule/${monthKey({ year: y, month: m })}`, request.url));
}
