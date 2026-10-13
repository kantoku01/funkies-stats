import type { GameResult, PlayerKind } from "@/types/database";
import { battingLine, playerLine, type BattingLine, type PlayerLine } from "./batting";
import {
  addCounts,
  countsFromBaseline,
  countsFromGame,
  emptyCounts,
  sumCounts,
  type BaselineInput,
  type CountingStats,
  type PlateAppearanceInput,
} from "./counting";
import { compareRatio } from "./ratio";
import { isQualified, teamRecord, type TeamBaselineInput, type TeamRecord } from "./team";

// DB から取ってきた1シーズン分の行。games 以下はすべてそのシーズンのものだけを渡す
export type SeasonInput = {
  season: number;
  players: { id: string; full_name: string; kind: PlayerKind; joined_on: string | null; left_on: string | null }[];
  games: { id: string; game_date: string; result: GameResult }[];
  participants: { game_id: string; player_id: string; extra_stolen_bases: number }[];
  plateAppearances: (PlateAppearanceInput & { game_id: string; player_id: string })[];
  baselines: (BaselineInput & { player_id: string; games: number })[];
  teamBaseline: (TeamBaselineInput & { as_of: string }) | null;
};

export type PlayerSeasonStats = PlayerLine & {
  playerId: string;
  fullName: string;
  kind: PlayerKind;
  qualified: boolean;
};

export type SeasonStats = {
  season: number;
  asOf: string | null; // 「◯/◯時点」。最新の試合日、なければ初期値の時点
  team: TeamRecord;
  teamBatting: BattingLine; // 助っ人を含む全選手の合計
  qualified: PlayerSeasonStats[]; // 規定到達(OPS降順)
  unqualified: PlayerSeasonStats[]; // 規定未達の正規メンバー(OPS降順)
  guests: PlayerSeasonStats[]; // 助っ人(OPS降順)
};

const seasonStart = (season: number) => `${season}-01-01`;
const seasonEnd = (season: number) => `${season}-12-31`;

// 正規メンバーがそのシーズンに在籍していたか
function enrolledIn(p: SeasonInput["players"][number], season: number): boolean {
  if (p.kind !== "regular" || !p.joined_on) return false;
  return p.joined_on <= seasonEnd(season) && (p.left_on === null || p.left_on >= seasonStart(season));
}

// 加入日以降かつ退団日以前の試合だけを数える(日付は YYYY-MM-DD なので文字列比較でよい)
function gamesWhileEnrolled(p: SeasonInput["players"][number], games: SeasonInput["games"]): number {
  return games.filter(
    (g) => (p.joined_on === null || g.game_date >= p.joined_on) && (p.left_on === null || g.game_date <= p.left_on),
  ).length;
}

export function byOpsDesc(a: PlayerSeasonStats, b: PlayerSeasonStats): number {
  return compareRatio(b.ops, a.ops) || b.pa - a.pa || a.fullName.localeCompare(b.fullName, "ja");
}

export function computeSeason(input: SeasonInput): SeasonStats {
  const team = teamRecord(input.teamBaseline, input.games);

  const pasByKey = new Map<string, PlateAppearanceInput[]>();
  for (const pa of input.plateAppearances) {
    const key = `${pa.game_id}:${pa.player_id}`;
    pasByKey.set(key, [...(pasByKey.get(key) ?? []), pa]);
  }

  const countsByPlayer = new Map<string, CountingStats>();
  const add = (playerId: string, c: CountingStats) =>
    countsByPlayer.set(playerId, addCounts(countsByPlayer.get(playerId) ?? emptyCounts(), c));

  const baselineGames = new Map<string, number>();
  for (const b of input.baselines) {
    add(b.player_id, countsFromBaseline(b));
    baselineGames.set(b.player_id, b.games);
  }
  for (const p of input.participants) {
    add(p.player_id, countsFromGame(pasByKey.get(`${p.game_id}:${p.player_id}`) ?? [], p.extra_stolen_bases));
  }

  const rows: PlayerSeasonStats[] = [];
  for (const p of input.players) {
    const counts = countsByPlayer.get(p.id);
    // 記録のない選手は、そのシーズンに在籍していた正規メンバーだけ表示する
    if (!counts && !enrolledIn(p, input.season)) continue;
    const c = counts ?? emptyCounts();

    // 正規: 初期値の試合数 + 在籍中のチーム試合数 / 助っ人: 出席数と同じ
    const games =
      p.kind === "guest" ? c.attendance : (baselineGames.get(p.id) ?? 0) + gamesWhileEnrolled(p, input.games);

    rows.push({
      ...playerLine(c, games),
      playerId: p.id,
      fullName: p.full_name,
      kind: p.kind,
      qualified: p.kind === "regular" && isQualified(c.pa, team.games),
    });
  }

  const latestGame = input.games.reduce<string | null>(
    (latest, g) => (latest === null || g.game_date > latest ? g.game_date : latest),
    null,
  );

  return {
    season: input.season,
    asOf: latestGame ?? input.teamBaseline?.as_of ?? null,
    team,
    teamBatting: battingLine(sumCounts([...countsByPlayer.values()])),
    qualified: rows.filter((r) => r.kind === "regular" && r.qualified).sort(byOpsDesc),
    unqualified: rows.filter((r) => r.kind === "regular" && !r.qualified).sort(byOpsDesc),
    guests: rows.filter((r) => r.kind === "guest").sort(byOpsDesc),
  };
}

// 成績一覧の既定シーズン: 試合(または初期値)が1つでもある最新のシーズン
export function defaultSeason(seasonsWithGames: number[], fallbackYear: number): number {
  return seasonsWithGames.length > 0 ? Math.max(...seasonsWithGames) : fallbackYear;
}
