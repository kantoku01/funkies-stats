import type { GameResult } from "@/types/database";
import { ratio, type Ratio } from "./ratio";

export type TeamBaselineInput = { games: number; wins: number; losses: number; draws: number };

export type TeamRecord = {
  games: number;
  wins: number;
  losses: number;
  draws: number;
  winPct: Ratio; // 勝 ÷ (勝 + 負)、引分は除く
};

export function teamRecord(baseline: TeamBaselineInput | null, games: { result: GameResult }[]): TeamRecord {
  let wins = baseline?.wins ?? 0;
  let losses = baseline?.losses ?? 0;
  let draws = baseline?.draws ?? 0;
  for (const g of games) {
    if (g.result === "win") wins += 1;
    else if (g.result === "lose") losses += 1;
    else draws += 1;
  }
  return {
    games: (baseline?.games ?? 0) + games.length,
    wins,
    losses,
    draws,
    winPct: ratio(wins, wins + losses),
  };
}

// 規定打席 = チーム試合数 × 1.2。小数の誤差を避けるため10倍の整数で持つ
export function qualifyingPaTimes10(teamGames: number): number {
  return teamGames * 12;
}

export function isQualified(pa: number, teamGames: number): boolean {
  return pa * 10 >= qualifyingPaTimes10(teamGames);
}

// 表示用(36 / 37.2)
export function formatQualifyingPa(teamGames: number): string {
  const t = qualifyingPaTimes10(teamGames);
  return t % 10 === 0 ? String(t / 10) : (t / 10).toFixed(1);
}
