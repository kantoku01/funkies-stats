// 2026年の移行データ(スプレッドシート 9/13 時点の累計)の読み込み。
// seed 生成スクリプト(scripts/generate-seed.ts)と単体テストの両方から使うため、他のモジュールに依存しない。

export const BASELINE_SEASON = 2026;
export const TEAM_BASELINE_2026 = { season: 2026, games: 30, wins: 16, losses: 14, draws: 0, as_of: "2026-09-13" };
export const REGULAR_JOINED_ON = "2026-01-01";

export type BaselineCsvRow = {
  index: number; // CSV の行順(0始まり)。seed の固定 ID に使う
  number: string | null;
  name: string;
  kind: "regular" | "guest";
  games: number;
  attendance: number;
  pa: number;
  singles: number;
  doubles: number;
  triples: number;
  home_runs: number;
  walks: number;
  hbp: number;
  sac_flies: number;
  sac_bunts: number;
  rbi: number;
  stolen_bases: number;
};

const HEADER = "背番号,シート上の名前,区分,試合数,出席,打席,単打,二塁打,三塁打,本塁打,四球,死球,犠飛,犠打,打点,盗塁";
const COUNT_KEYS = [
  "games", "attendance", "pa", "singles", "doubles", "triples", "home_runs",
  "walks", "hbp", "sac_flies", "sac_bunts", "rbi", "stolen_bases",
] as const;

export function parseBaselineCsv(text: string): BaselineCsvRow[] {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines[0] !== HEADER) throw new Error(`CSV の見出しが想定と違います: ${lines[0]}`);

  return lines.slice(1).map((line, index) => {
    const cells = line.split(",");
    if (cells.length !== 16) throw new Error(`${index + 2}行目: 列数が16ではありません`);
    const [number, name, kindLabel, ...counts] = cells;
    if (kindLabel !== "正規" && kindLabel !== "助っ人") throw new Error(`${index + 2}行目: 区分が不正です: ${kindLabel}`);

    const row = {
      index,
      number: number === "" ? null : number,
      name: name.trim(),
      kind: kindLabel === "正規" ? "regular" : "guest",
    } as BaselineCsvRow;
    COUNT_KEYS.forEach((key, i) => {
      const n = Number(counts[i]);
      if (!Number.isInteger(n) || n < 0) throw new Error(`${index + 2}行目: ${key} が不正です: ${counts[i]}`);
      row[key] = n;
    });
    return row;
  });
}

// seed で使う選手の固定 ID(再投入やフルネームの後入れで同じ行を指せるように)
export function baselinePlayerId(index: number): string {
  return `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
}
