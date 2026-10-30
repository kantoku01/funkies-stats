import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { computeSeason, displayNumber, type SeasonStats } from "@/lib/stats";
import { createPublicClient } from "@/lib/supabase/public";
import { fetchAll } from "./fetch-all";

// 成績データのキャッシュタグ。試合・打席・選手などを書き換えたら updateTag(STATS_TAG) を呼ぶ
export const STATS_TAG = "stats";

// 試合または初期値があるシーズン(新しい順)
export async function getSeasons(): Promise<number[]> {
  "use cache";
  cacheTag(STATS_TAG);
  cacheLife("minutes");

  const supabase = createPublicClient();
  const [games, baselines] = await Promise.all([
    fetchAll((from, to) => supabase.from("games").select("season").range(from, to)),
    supabase.from("team_season_baselines").select("season"),
  ]);
  if (baselines.error) throw new Error(baselines.error.message);

  const seasons = new Set([...games.map((g) => g.season), ...(baselines.data ?? []).map((b) => b.season)]);
  return [...seasons].sort((a, b) => b - a);
}

export type SeasonStatsWithNumbers = SeasonStats & {
  numbers: Record<string, string>; // player_id → 表示用の背番号(助っ人は「助」)
  managers: { playerId: string; fullName: string; number: string }[]; // そのシーズンに在籍したマネージャー(成績なし)
};

export async function getSeasonStats(season: number): Promise<SeasonStatsWithNumbers> {
  "use cache";
  cacheTag(STATS_TAG);
  cacheLife("minutes");

  const supabase = createPublicClient();
  const unwrap = <T,>(r: { data: T | null; error: { message: string } | null }): T => {
    if (r.error) throw new Error(r.error.message);
    return r.data as T;
  };

  const [games, players, numbers, baselines, teamBaseline] = await Promise.all([
    fetchAll((from, to) =>
      supabase.from("games").select("id, game_date, result").eq("season", season).order("id").range(from, to),
    ),
    fetchAll((from, to) =>
      supabase.from("players").select("id, full_name, kind, joined_on, left_on").order("id").range(from, to),
    ),
    fetchAll((from, to) =>
      supabase
        .from("season_numbers")
        .select("season, player_id, number")
        .lte("season", season)
        .order("season")
        .order("player_id")
        .range(from, to),
    ),
    supabase.from("season_baselines").select("*").eq("season", season).then(unwrap),
    supabase.from("team_season_baselines").select("*").eq("season", season).maybeSingle().then(unwrap),
  ]);

  const gameIds = games.map((g) => g.id);
  const [participants, plateAppearances] =
    gameIds.length === 0
      ? [[], []]
      : await Promise.all([
          fetchAll((from, to) =>
            supabase
              .from("game_participants")
              .select("game_id, player_id, extra_stolen_bases")
              .in("game_id", gameIds)
              .order("game_id")
              .order("player_id")
              .range(from, to),
          ),
          fetchAll((from, to) =>
            supabase
              .from("plate_appearances")
              .select("game_id, player_id, result, rbi, stolen_bases")
              .in("game_id", gameIds)
              .order("id")
              .range(from, to),
          ),
        ]);

  const stats = computeSeason({
    season,
    players,
    games,
    participants,
    plateAppearances,
    baselines: baselines ?? [],
    teamBaseline,
  });

  const shown = [...stats.qualified, ...stats.unqualified, ...stats.guests];
  const managers = players
    .filter(
      (p) =>
        p.kind === "manager" &&
        (p.joined_on ?? "") <= `${season}-12-31` &&
        (p.left_on === null || p.left_on >= `${season}-01-01`),
    )
    .map((p) => ({ playerId: p.id, fullName: p.full_name, number: displayNumber(numbers, p.id, season, p.kind) }));
  return {
    ...stats,
    numbers: Object.fromEntries(shown.map((p) => [p.playerId, displayNumber(numbers, p.playerId, season, p.kind)])),
    managers,
  };
}
