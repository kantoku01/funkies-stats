import { connection } from "next/server";
import { lineConfigured, pushToGroup } from "@/lib/line/api";
import { isCronRequest } from "@/lib/line/cron";
import { scheduleMessage, siteUrl } from "@/lib/line/messages";
import { getGroupId, recordPost, wasPosted } from "@/lib/line/posts";
import { shiftDay } from "@/lib/schedule/month";
import { todayInJapan } from "@/lib/season";
import { createAdminClient } from "@/lib/supabase/admin";

// 毎日10時(日本時間): 昨日が試合の日だったら、今日以降のスケジュールをグループに送る
export async function GET(request: Request) {
  await connection();
  if (!isCronRequest(request)) return new Response("unauthorized", { status: 401 });
  if (!lineConfigured()) return Response.json({ skipped: "LINE の設定がありません" });
  const groupId = await getGroupId();
  if (!groupId) return Response.json({ skipped: "送り先のグループがありません" });

  const today = todayInJapan(new Date());
  const yesterday = shiftDay(today, -1);
  const { count, error } = await createAdminClient()
    .from("games")
    .select("id", { count: "exact", head: true })
    .eq("game_date", yesterday);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!count) return Response.json({ skipped: `${yesterday} は試合がありません` });
  if (await wasPosted("schedule", yesterday)) return Response.json({ skipped: "送信済み" });

  const sent = await pushToGroup(groupId, await scheduleMessage(siteUrl(), today));
  if (sent.ok) await recordPost("schedule", yesterday, true);
  return Response.json({ day: yesterday, ...sent });
}
