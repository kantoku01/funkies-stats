import type { GameStage, GameType } from "@/types/database";

export const GAME_TYPE_LABEL: Record<GameType, string> = { open: "オープン戦", official: "公式戦" };
export const STAGE_LABEL: Record<GameStage, string> = { league: "予選リーグ", knockout: "決勝トーナメント" };

// 回戦の入力候補
export const ROUND_SUGGESTIONS: Record<GameStage, string[]> = {
  league: ["Aブロック 第1戦", "Aブロック 第2戦", "Bブロック 第1戦", "第1戦", "第2戦", "第3戦"],
  knockout: ["1回戦", "2回戦", "3回戦", "準々決勝", "準決勝", "決勝", "3位決定戦"],
};

export type GameTypeInfo = {
  game_type: GameType;
  stage: GameStage | null;
  round_label: string | null;
  tournament: { name: string } | null;
};

// 「オープン戦」/「市民大会 決勝トーナメント 1回戦」
export function gameTypeLabel(g: GameTypeInfo): string {
  if (g.game_type === "open") return GAME_TYPE_LABEL.open;
  return [g.tournament?.name ?? "公式戦", g.stage ? STAGE_LABEL[g.stage] : null, g.round_label].filter(Boolean).join(" ");
}

// 成績の絞り込み: all(全試合)/ official / open / t-<大会ID>
export type GameFilter = { key: string; kind: "all" | "official" | "open" | "tournament"; tournamentId: string | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseGameFilter(value: string | string[] | undefined): GameFilter {
  const v = Array.isArray(value) ? value[0] : value;
  if (v === "official" || v === "open") return { key: v, kind: v, tournamentId: null };
  if (v?.startsWith("t-") && UUID.test(v.slice(2))) return { key: v, kind: "tournament", tournamentId: v.slice(2) };
  return { key: "all", kind: "all", tournamentId: null };
}

export function matchesFilter(g: { game_type: GameType; tournament_id: string | null }, f: GameFilter): boolean {
  if (f.kind === "all") return true;
  if (f.kind === "tournament") return g.tournament_id === f.tournamentId;
  return g.game_type === f.kind;
}
