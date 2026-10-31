import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "./fetch-all";
import { STATS_TAG } from "./stats";

const GAME_COLUMNS =
  "id, game_date, opponent, team_score, opponent_score, result, memo, status, start_time, meet_time, venue, uniform, bring_bases, game_type, tournament_id, stage, round_label, tournament:tournaments(name)" as const;

// 試合一覧(誰でも閲覧)。予定も含む。新しい順
export async function getGamesBySeason(season: number) {
  "use cache: remote";
  cacheTag(STATS_TAG);
  cacheLife("hours");

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

// 試合一覧で選べるシーズン(予定だけのシーズンも含む。新しい順)
export async function getGameSeasons(): Promise<number[]> {
  "use cache: remote";
  cacheTag(STATS_TAG);
  cacheLife("hours");

  const supabase = createPublicClient();
  const rows = await fetchAll((from, to) => supabase.from("games").select("season").order("id").range(from, to));
  return [...new Set(rows.map((r) => r.season))].sort((a, b) => b - a);
}

// 次の試合: 今日以降でいちばん近い予定(today は日本時間の YYYY-MM-DD)
export async function getNextGame(today: string) {
  "use cache: remote";
  cacheTag(STATS_TAG);
  cacheLife("hours");

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("games")
    .select(GAME_COLUMNS)
    .eq("status", "scheduled")
    .gte("game_date", today)
    .order("game_date")
    .order("start_time", { nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
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

// 編集画面用: 大会の一覧(新しい年から)
export async function getTournamentsForAdmin() {
  const supabase = await createClient();
  return fetchAll((from, to) =>
    supabase.from("tournaments").select("id, season, name").order("season", { ascending: false }).order("name").range(from, to),
  );
}
