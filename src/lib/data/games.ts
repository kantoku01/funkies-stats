import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "./fetch-all";
import { STATS_TAG } from "./stats";

const GAME_COLUMNS = "id, game_date, opponent, team_score, opponent_score, result, memo" as const;

// 試合一覧(誰でも閲覧)。新しい順
export async function getGamesBySeason(season: number) {
  "use cache";
  cacheTag(STATS_TAG);
  cacheLife("minutes");

  const supabase = createPublicClient();
  return fetchAll((from, to) =>
    supabase
      .from("games")
      .select(GAME_COLUMNS)
      .eq("season", season)
      .order("game_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to),
  );
}

// 以下は編集画面用(ログイン中のセッションで、キャッシュせず最新を読む)

export async function getGameForAdmin(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("games").select(`${GAME_COLUMNS}, season`).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

// 参加者と、選手ごとの打席数
export async function getParticipantsForAdmin(gameId: string) {
  const supabase = await createClient();
  const [participants, plateAppearances] = await Promise.all([
    fetchAll((from, to) =>
      supabase
        .from("game_participants")
        .select("player_id, batting_order, extra_stolen_bases")
        .eq("game_id", gameId)
        .order("player_id")
        .range(from, to),
    ),
    fetchAll((from, to) =>
      supabase.from("plate_appearances").select("player_id").eq("game_id", gameId).order("id").range(from, to),
    ),
  ]);
  const paCount = new Map<string, number>();
  for (const pa of plateAppearances) paCount.set(pa.player_id, (paCount.get(pa.player_id) ?? 0) + 1);
  return participants.map((p) => ({ ...p, paCount: paCount.get(p.player_id) ?? 0 }));
}

// 打撃入力画面用: その試合の全打席(選手ごと・打席順)
export async function getPlateAppearancesForAdmin(gameId: string) {
  const supabase = await createClient();
  return fetchAll((from, to) =>
    supabase
      .from("plate_appearances")
      .select("player_id, seq, result, rbi, stolen_bases")
      .eq("game_id", gameId)
      .order("player_id")
      .order("seq")
      .range(from, to),
  );
}
