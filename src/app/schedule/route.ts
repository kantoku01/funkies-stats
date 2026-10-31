import { connection, NextResponse, type NextRequest } from "next/server";
import { getScheduleMonth } from "@/lib/data/schedule";
import { monthKey, monthToOpen, parseMonth } from "@/lib/schedule/month";
import { todayInJapan } from "@/lib/season";

// /schedule は今月(日本時間)の予定・出欠ページへ。今月の予定日がもう全部終わっていたら来月へ
export async function GET(request: NextRequest) {
  // 毎回その日の日付で決める(ビルド時に固定しない)
  await connection();
  const today = todayInJapan(new Date());
  const { days } = await getScheduleMonth(parseMonth(today.slice(0, 7))!);
  const m = monthToOpen(
    today,
    days.filter((d) => d.kind !== "off" || d.games.length > 0).map((d) => d.day),
  );
  return NextResponse.redirect(new URL(`/schedule/${monthKey(m)}`, request.url));
}
