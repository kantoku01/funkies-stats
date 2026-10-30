import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { matchesFilter, parseGameFilter } from "@/lib/games/type-label";
import { computeSeason, displayNumber, teamRecord, type SeasonStats } from "@/lib/stats";
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

// filterKey: all(全試合)/ official / open / t-<大会ID>。全試合以外は移行データ(初期値)を含めない
export async function getSeasonStats(season: number, filterKey = "all"): Promise<SeasonStatsWithNumbers> {
  "use cache";
  cacheTag(STATS_TAG);
  cacheLife("minutes");

  const supabase = createPublicClient();
  const unwrap = <T,>(r: { data: T | null; error: { message: string } | null }): T => {
    if (r.error) throw new Error(r.error.message);
    return r.data as T;
  };

  const filter = parseGameFilter(filterKey);
  const [allGames, players, numbers, baselines, teamBaseline] = await Promise.all([
    fetchAll((from, to) =>
      supabase
        .from("games")
        .select("id, game_date, result, game_type, tournament_id")
        .eq("season", season)
        .order("id")
        .range(from, to),
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

  const games = allGames.filter((g) => matchesFilter(g, filter));
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
    // 移行データは試合ごとの内訳がないので、全試合のときだけ使う
    baselines: filter.kind === "all" ? (baselines ?? []) : [],
    teamBaseline: filter.kind === "all" ? teamBaseline : null,
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

export type TournamentSummary = {
  id: string;
  name: string;
  games: number;
  wins: number;
  losses: number;
  draws: number;
};

// そのシーズンの大会と、大会ごとの勝敗(大会の登録順)
export async function getSeasonTournaments(season: number): Promise<TournamentSummary[]> {
  "use cache";
  cacheTag(STATS_TAG);
  cacheLife("minutes");

  const supabase = createPublicClient();
  const [tournaments, games] = await Promise.all([
    fetchAll((from, to) =>
      supabase.from("tournaments").select("id, name").eq("season", season).order("created_at").range(from, to),
    ),
    fetchAll((from, to) =>
      supabase
        .from("games")
        .select("tournament_id, result")
        .eq("season", season)
        .eq("game_type", "official")
        .order("id")
        .range(from, to),
    ),
  ]);
  return tournaments.map((t) => {
    const r = teamRecord(null, games.filter((g) => g.tournament_id === t.id));
    return { id: t.id, name: t.name, games: r.games, wins: r.wins, losses: r.losses, draws: r.draws };
  });
}
