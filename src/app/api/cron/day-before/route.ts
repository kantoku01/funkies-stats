import { connection } from "next/server";
import { getGameDetail } from "@/lib/data/detail";
import { lineConfigured, pushToGroup } from "@/lib/line/api";
import { isCronRequest } from "@/lib/line/cron";
import { gameDayBeforeMessage } from "@/lib/line/messages";
import { getGroupId, recordPost, wasPosted } from "@/lib/line/posts";
import { shiftDay } from "@/lib/schedule/month";
import { todayInJapan } from "@/lib/season";
import { createAdminClient } from "@/lib/supabase/admin";

// 毎日18時(日本時間): 明日の試合の連絡をグループに送る。編集者がもう送っていれば送らない
export async function GET(request: Request) {
  await connection();
  if (!isCronRequest(request)) return new Response("unauthorized", { status: 401 });
  if (!lineConfigured()) return Response.json({ skipped: "LINE の設定がありません" });
  const groupId = await getGroupId();
  if (!groupId) return Response.json({ skipped: "送り先のグループがありません" });

  const tomorrow = shiftDay(todayInJapan(new Date()), 1);
  const { data: games, error } = await createAdminClient()
    .from("games")
    .select("id")
    .eq("game_date", tomorrow)
    .eq("status", "scheduled")
    .order("start_time", { nullsFirst: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const results = [];
  for (const { id } of games ?? []) {
    if (await wasPosted("day_before", id)) {
      results.push({ id, skipped: "送信済み" });
      continue;
    }
    const game = await getGameDetail(id);
    if (!game) continue;
    const sent = await pushToGroup(groupId, await gameDayBeforeMessage(game));
    if (sent.ok) await recordPost("day_before", id, true);
    results.push({ id, ...sent });
  }
  return Response.json({ day: tomorrow, results });
}
