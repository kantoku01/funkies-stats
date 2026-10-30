import { roundToThousandths, type PlayerSeasonStats, type Ratio } from "@/lib/stats";

type NumericKey = "homeRuns" | "rbi" | "stolenBases" | "hits";
type RateKey = "avg" | "ops" | "contribution" | "attendanceRate";

export type RankingCategory =
  | { key: RateKey; label: string; pool: "qualified" | "regular"; kind: "rate" }
  | { key: NumericKey; label: string; pool: "regular"; kind: "count"; unit: string };

// ホーム画面のランキング。率は規定到達者(出席率だけは正規メンバー全員)、数は正規メンバー全員が対象
export const RANKING_CATEGORIES: RankingCategory[] = [
  { key: "avg", label: "打率", pool: "qualified", kind: "rate" },
  { key: "homeRuns", label: "本塁打", pool: "regular", kind: "count", unit: "本" },
  { key: "rbi", label: "打点", pool: "regular", kind: "count", unit: "" },
  { key: "stolenBases", label: "盗塁", pool: "regular", kind: "count", unit: "" },
  { key: "ops", label: "OPS", pool: "qualified", kind: "rate" },
  { key: "attendanceRate", label: "出席率", pool: "regular", kind: "rate" },
  { key: "hits", label: "安打", pool: "regular", kind: "count", unit: "本" },
  { key: "contribution", label: "打撃貢献率", pool: "qualified", kind: "rate" },
];

// 比べる値。率は画面に出す3桁(.333)が同じなら同率にする
export function categoryScore(c: RankingCategory, p: PlayerSeasonStats): number {
  return c.kind === "rate" ? roundToThousandths(p[c.key] as Ratio) : (p[c.key] as number);
}
