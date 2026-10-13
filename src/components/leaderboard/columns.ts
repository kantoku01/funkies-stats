// 成績表の列。Server / Client の両方から使う
export const STAT_COLUMNS = [
  // 既定の並び順(OPS)をスマホでも最初に見えるよう先頭に置く
  { key: "ops", label: "OPS", rate: true },
  { key: "avg", label: "打率", rate: true },
  { key: "obp", label: "出塁率", rate: true },
  { key: "slg", label: "長打率", rate: true },
  { key: "contribution", label: "打撃貢献率", rate: true },
  { key: "games", label: "試合" },
  { key: "attendance", label: "出席" },
  { key: "attendanceRate", label: "出席率", rate: true },
  { key: "pa", label: "打席" },
  { key: "atBats", label: "打数" },
  { key: "hits", label: "安打" },
  { key: "singles", label: "単打" },
  { key: "doubles", label: "二塁打" },
  { key: "triples", label: "三塁打" },
  { key: "homeRuns", label: "本塁打" },
  { key: "totalBases", label: "塁打数" },
  { key: "rbi", label: "打点" },
  { key: "stolenBases", label: "盗塁" },
  { key: "walks", label: "四球" },
  { key: "hbp", label: "死球" },
  { key: "sacFlies", label: "犠飛" },
  { key: "sacBunts", label: "犠打" },
] as const;

export type StatKey = (typeof STAT_COLUMNS)[number]["key"];
export type SortKey = StatKey | "number" | "name";

export type LeaderboardRow = {
  playerId: string;
  number: string;
  name: string;
  values: Record<StatKey, number>; // 並べ替え用
  display: Record<StatKey, string>; // 表示用(率は .333 形式)
};

export type LeaderboardGroup = {
  key: "qualified" | "unqualified" | "guests";
  label: string | null; // null は見出しなし(規定到達)
  rows: LeaderboardRow[];
};

export type TeamTotalsRow = {
  display: Partial<Record<StatKey, string>>;
};
