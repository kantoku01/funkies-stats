import "server-only";
import type { BattingLine, PlayerSeasonStats, Ratio } from "@/lib/stats";
import { formatRate, ratioValue } from "@/lib/stats";
import { STAT_COLUMNS, type LeaderboardRow, type StatKey, type TeamTotalsRow } from "./columns";

function cell(value: number | Ratio): { value: number; display: string } {
  return typeof value === "number"
    ? { value, display: String(value) }
    : { value: ratioValue(value), display: formatRate(value) };
}

export function toRow(p: PlayerSeasonStats, number: string): LeaderboardRow {
  const values = {} as Record<StatKey, number>;
  const display = {} as Record<StatKey, string>;
  for (const col of STAT_COLUMNS) {
    const c = cell(p[col.key]);
    values[col.key] = c.value;
    display[col.key] = c.display;
  }
  return { playerId: p.playerId, number, name: p.fullName, values, display };
}

// チーム合計の行。試合・出席率・打撃貢献率は選手単位の項目なので空欄
export function toTeamRow(t: BattingLine, teamGames: number): TeamTotalsRow {
  const display: TeamTotalsRow["display"] = {};
  for (const col of STAT_COLUMNS) {
    if (col.key === "games") display.games = String(teamGames);
    else if (col.key === "attendanceRate" || col.key === "contribution") continue;
    else display[col.key] = cell(t[col.key]).display;
  }
  return { display };
}
