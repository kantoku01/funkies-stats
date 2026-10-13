import type { CountingStats } from "./counting";
import { addRatio, mulRatio, ratio, type Ratio } from "./ratio";

export type BattingLine = CountingStats & {
  atBats: number;
  hits: number;
  totalBases: number;
  avg: Ratio;
  obp: Ratio;
  slg: Ratio;
  ops: Ratio;
};

// 打数・安打・塁打数・各率を計算する(要件「成績の計算ルール」)
export function battingLine(c: CountingStats): BattingLine {
  const atBats = c.pa - c.walks - c.hbp - c.sacFlies - c.sacBunts;
  const hits = c.singles + c.doubles + c.triples + c.homeRuns;
  const totalBases = c.singles + c.doubles * 2 + c.triples * 3 + c.homeRuns * 4;
  const avg = ratio(hits, atBats);
  const obp = ratio(hits + c.walks + c.hbp, atBats + c.walks + c.hbp + c.sacFlies);
  const slg = ratio(totalBases, atBats);
  return { ...c, atBats, hits, totalBases, avg, obp, slg, ops: addRatio(obp, slg) };
}

export type PlayerLine = BattingLine & {
  games: number;
  attendanceRate: Ratio;
  contribution: Ratio; // 打撃貢献率 = 出席率 × OPS
};

export function playerLine(c: CountingStats, games: number): PlayerLine {
  const line = battingLine(c);
  const attendanceRate = ratio(c.attendance, games);
  return { ...line, games, attendanceRate, contribution: mulRatio(attendanceRate, line.ops) };
}
