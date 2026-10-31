import "server-only";
import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "./fetch-all";

// 編集画面用の読み取り(ログイン中のセッションで、キャッシュせず最新を読む)

export async function getPlayersForAdmin() {
  const supabase = await createClient();
  const [players, numbers] = await Promise.all([
    fetchAll((from, to) =>
      supabase.from("players").select("id, full_name, kind, joined_on, left_on").order("created_at").order("id").range(from, to),
    ),
    fetchAll((from, to) =>
      supabase.from("season_numbers").select("season, player_id, number").order("season").order("player_id").range(from, to),
    ),
  ]);
  return { players, numbers };
}

export async function getPlayerForAdmin(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .select("id, full_name, kind, joined_on, left_on, carpool_group")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

// 試合の記録・初期値・入出金があるか(あれば削除させない)
export async function playerHasRecords(id: string): Promise<boolean> {
  const supabase = await createClient();
  const [participants, baselines, ledger] = await Promise.all([
    supabase.from("game_participants").select("game_id", { count: "exact", head: true }).eq("player_id", id),
    supabase.from("season_baselines").select("season", { count: "exact", head: true }).eq("player_id", id),
    supabase.from("ledger_entries").select("id", { count: "exact", head: true }).eq("player_id", id),
  ]);
  for (const r of [participants, baselines, ledger]) if (r.error) throw new Error(r.error.message);
  return (participants.count ?? 0) + (baselines.count ?? 0) + (ledger.count ?? 0) > 0;
}
