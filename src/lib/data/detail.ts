import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { battingOrderSort, type BattingEntry } from "@/lib/batting/entry";
import { resolveNumber } from "@/lib/stats";
import { createPublicClient } from "@/lib/supabase/public";
import type { GameResult } from "@/types/database";
import { fetchAll } from "./fetch-all";
import { STATS_TAG } from "./stats";

export type GameLine = {
  playerId: string;
  name: string;
  number: string;
  battingOrder: number | null;
  entries: BattingEntry[];
  extraStolenBases: number;
};

export type GameDetail = {
  id: string;
  season: number;
  gameDate: string;
  opponent: string | null;
  teamScore: number | null;
  opponentScore: number | null;
  result: GameResult;
  memo: string | null;
  lines: GameLine[]; // 打順 → 背番号 → 助っ人の順
};

// 試合詳細(誰でも閲覧)
export async function getGameDetail(id: string): Promise<GameDetail | null> {
  "use cache";
  cacheTag(STATS_TAG);
  cacheLife("minutes");

  const supabase = createPublicClient();
  const { data: game, error } = await supabase
    .from("games")
    .select("id, season, game_date, opponent, team_score, opponent_score, result, memo")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!game) return null;

  const [participants, pas, players, numbers] = await Promise.all([
    fetchAll((from, to) =>
      supabase
        .from("game_participants")
        .select("player_id, batting_order, extra_stolen_bases")
        .eq("game_id", id)
        .order("player_id")
        .range(from, to),
    ),
    fetchAll((from, to) =>
      supabase
        .from("plate_appearances")
        .select("player_id, seq, result, rbi, stolen_bases")
        .eq("game_id", id)
        .order("player_id")
        .order("seq")
        .range(from, to),
    ),
    fetchAll((from, to) => supabase.from("players").select("id, full_name, kind").order("id").range(from, to)),
    fetchAll((from, to) =>
      supabase
        .from("season_numbers")
        .select("season, player_id, number")
        .lte("season", game.season)
        .order("season")
        .order("player_id")
        .range(from, to),
    ),
  ]);

  const byId = new Map(players.map((p) => [p.id, p]));
  const lines = battingOrderSort(
    participants.map((p) => {
      const player = byId.get(p.player_id);
      return {
        playerId: p.player_id,
        name: player?.full_name ?? "(不明な選手)",
        number: player?.kind === "guest" ? "助" : (resolveNumber(numbers, p.player_id, game.season) ?? ""),
        battingOrder: p.batting_order,
        extraStolenBases: p.extra_stolen_bases,
        entries: pas
          .filter((pa) => pa.player_id === p.player_id)
          .map((pa) => ({ result: pa.result, rbi: pa.rbi, stolenBases: pa.stolen_bases })),
      };
    }),
  );

  return {
    id: game.id,
    season: game.season,
    gameDate: game.game_date,
    opponent: game.opponent,
    teamScore: game.team_score,
    opponentScore: game.opponent_score,
    result: game.result,
    memo: game.memo,
    lines,
  };
}

export type PlayerGameRow = {
  gameId: string;
  gameDate: string;
  opponent: string | null;
  result: GameResult;
  teamScore: number | null;
  opponentScore: number | null;
  entries: BattingEntry[];
  extraStolenBases: number;
};

export type PlayerPage = {
  player: { id: string; fullName: string; kind: "regular" | "guest" | "manager"; joinedOn: string | null; leftOn: string | null };
  number: string;
  seasons: number[]; // 記録のあるシーズン(新しい順)
  games: PlayerGameRow[]; // 指定シーズンの出場試合(新しい順)
};

// 個人成績ページ用(誰でも閲覧)。シーズン累計は getSeasonStats から取る
export async function getPlayerPage(playerId: string, season: number | null): Promise<PlayerPage | null> {
  "use cache";
  cacheTag(STATS_TAG);
  cacheLife("minutes");

  const supabase = createPublicClient();
  const { data: player, error } = await supabase
    .from("players")
    .select("id, full_name, kind, joined_on, left_on")
    .eq("id", playerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!player) return null;

  const [participations, baselines, numbers] = await Promise.all([
    fetchAll((from, to) =>
      supabase
        .from("game_participants")
        .select("game_id, extra_stolen_bases, games!inner(season, game_date, opponent, result, team_score, opponent_score)")
        .eq("player_id", playerId)
        .order("game_id")
        .range(from, to),
    ),
    supabase.from("season_baselines").select("season").eq("player_id", playerId),
    fetchAll((from, to) =>
      supabase.from("season_numbers").select("season, player_id, number").eq("player_id", playerId).order("season").range(from, to),
    ),
  ]);
  if (baselines.error) throw new Error(baselines.error.message);

  const seasons = [
    ...new Set([...participations.map((p) => p.games.season), ...(baselines.data ?? []).map((b) => b.season)]),
  ].sort((a, b) => b - a);
  const target = season !== null && seasons.includes(season) ? season : (seasons[0] ?? null);

  const inSeason = participations.filter((p) => p.games.season === target);
  const gameIds = inSeason.map((p) => p.game_id);
  const pas =
    gameIds.length === 0
      ? []
      : await fetchAll((from, to) =>
          supabase
            .from("plate_appearances")
            .select("game_id, seq, result, rbi, stolen_bases")
            .eq("player_id", playerId)
            .in("game_id", gameIds)
            .order("game_id")
            .order("seq")
            .range(from, to),
        );

  const games: PlayerGameRow[] = inSeason
    .map((p) => ({
      gameId: p.game_id,
      gameDate: p.games.game_date,
      opponent: p.games.opponent,
      result: p.games.result,
      teamScore: p.games.team_score,
      opponentScore: p.games.opponent_score,
      extraStolenBases: p.extra_stolen_bases,
      entries: pas
        .filter((pa) => pa.game_id === p.game_id)
        .map((pa) => ({ result: pa.result, rbi: pa.rbi, stolenBases: pa.stolen_bases })),
    }))
    .sort((a, b) => (a.gameDate < b.gameDate ? 1 : a.gameDate > b.gameDate ? -1 : 0));

  return {
    player: {
      id: player.id,
      fullName: player.full_name,
      kind: player.kind,
      joinedOn: player.joined_on,
      leftOn: player.left_on,
    },
    number: player.kind === "guest" ? "助" : (resolveNumber(numbers, player.id, target ?? 9999) ?? ""),
    seasons,
    games,
  };
}
