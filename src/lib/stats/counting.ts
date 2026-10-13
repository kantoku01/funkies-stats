import type { PlateAppearanceResult } from "@/types/database";

// 打席結果から数える項目(+出席)。シーズン累計はこれを足し合わせて作る
export type CountingStats = {
  attendance: number;
  pa: number;
  singles: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  walks: number;
  hbp: number;
  sacFlies: number;
  sacBunts: number;
  rbi: number;
  stolenBases: number;
};

export const emptyCounts = (): CountingStats => ({
  attendance: 0,
  pa: 0,
  singles: 0,
  doubles: 0,
  triples: 0,
  homeRuns: 0,
  walks: 0,
  hbp: 0,
  sacFlies: 0,
  sacBunts: 0,
  rbi: 0,
  stolenBases: 0,
});

export function addCounts(a: CountingStats, b: CountingStats): CountingStats {
  const sum = emptyCounts();
  for (const key of Object.keys(sum) as (keyof CountingStats)[]) {
    sum[key] = a[key] + b[key];
  }
  return sum;
}

export function sumCounts(list: CountingStats[]): CountingStats {
  return list.reduce(addCounts, emptyCounts());
}

const resultKey: Record<Exclude<PlateAppearanceResult, "out">, keyof CountingStats> = {
  single: "singles",
  double: "doubles",
  triple: "triples",
  home_run: "homeRuns",
  walk: "walks",
  hbp: "hbp",
  sac_fly: "sacFlies",
  sac_bunt: "sacBunts",
};

export type PlateAppearanceInput = {
  result: PlateAppearanceResult;
  rbi: number;
  stolen_bases: number;
};

// 1試合分(参加1回)の集計。打席0でも出席は1
export function countsFromGame(
  plateAppearances: PlateAppearanceInput[],
  extraStolenBases: number,
): CountingStats {
  const c = emptyCounts();
  c.attendance = 1;
  c.stolenBases = extraStolenBases;
  for (const pa of plateAppearances) {
    c.pa += 1;
    c.rbi += pa.rbi;
    c.stolenBases += pa.stolen_bases;
    if (pa.result !== "out") c[resultKey[pa.result]] += 1;
  }
  return c;
}

export type BaselineInput = {
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

export function countsFromBaseline(b: BaselineInput): CountingStats {
  return {
    attendance: b.attendance,
    pa: b.pa,
    singles: b.singles,
    doubles: b.doubles,
    triples: b.triples,
    homeRuns: b.home_runs,
    walks: b.walks,
    hbp: b.hbp,
    sacFlies: b.sac_flies,
    sacBunts: b.sac_bunts,
    rbi: b.rbi,
    stolenBases: b.stolen_bases,
  };
}
