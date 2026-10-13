import "server-only";
import { getSeasons } from "@/lib/data/stats";
import { currentYearInJapan } from "@/lib/season";

// 選手管理で選べるシーズン: 記録のあるシーズン + 今年 + 来年(年明け前に背番号を準備できるように)
export async function getEditableSeasons(now: Date): Promise<number[]> {
  const thisYear = currentYearInJapan(now);
  const seasons = new Set([...(await getSeasons()), thisYear, thisYear + 1]);
  return [...seasons].sort((a, b) => b - a);
}

export function pickSeason(value: string | string[] | undefined, seasons: number[], fallback: number): number {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return seasons.includes(n) ? n : fallback;
}
