import { resolveNumber, type SeasonNumberRow } from "@/lib/stats";

// 指定シーズンに同じ背番号を使っている(引き継ぎを含む)他の在籍選手を探す
export function findNumberConflict(
  rows: SeasonNumberRow[],
  players: { id: string; full_name: string; kind: string; left_on: string | null }[],
  season: number,
  playerId: string | null,
  number: string,
): { playerId: string; fullName: string } | null {
  for (const p of players) {
    if (p.id === playerId || p.kind === "guest") continue;
    // そのシーズンが始まる前に退団した選手の番号は空いている
    if (p.left_on !== null && p.left_on < `${season}-01-01`) continue;
    if (resolveNumber(rows, p.id, season) === number) return { playerId: p.id, fullName: p.full_name };
  }
  return null;
}
