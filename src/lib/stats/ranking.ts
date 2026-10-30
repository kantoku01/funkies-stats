import type { GameResult } from "@/types/database";

export type RankGroup<T> = { rank: number; items: T[] };

// 上位を順位ごとにまとめる。同じ値は同率で、次の順位は人数分とばす(1位・2位・2位・4位)。
// score は比べる値(率は表示している3桁の整数、数はそのまま)。大きいほど上位。
export function topRanks<T>(
  items: T[],
  score: (item: T) => number,
  { maxRank = 3, excludeZero = false, tieBreak }: { maxRank?: number; excludeZero?: boolean; tieBreak?: (a: T, b: T) => number } = {},
): RankGroup<T>[] {
  const scored = items
    .map((item) => ({ item, s: score(item) }))
    .filter((x) => !excludeZero || x.s > 0)
    .sort((a, b) => b.s - a.s || (tieBreak ? tieBreak(a.item, b.item) : 0));

  const groups: RankGroup<T>[] = [];
  scored.forEach((x, i) => {
    const last = groups.at(-1);
    if (last && score(last.items[0]) === x.s) {
      last.items.push(x.item);
    } else {
      const rank = i + 1;
      if (rank > maxRank) return;
      groups.push({ rank, items: [x.item] });
    }
  });
  return groups;
}

// 今の連勝・連敗(新しい順の勝敗から)。引き分けは挟んでも途切れない。2以上のときだけ返す
export function currentStreak(resultsNewestFirst: GameResult[]): { kind: "win" | "lose"; count: number } | null {
  let kind: "win" | "lose" | null = null;
  let count = 0;
  for (const r of resultsNewestFirst) {
    if (r === "draw") continue;
    if (kind === null) kind = r;
    if (r !== kind) break;
    count += 1;
  }
  return kind !== null && count >= 2 ? { kind, count } : null;
}
