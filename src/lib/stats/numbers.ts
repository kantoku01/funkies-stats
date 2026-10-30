// シーズン別背番号の解決。行がなければ前のシーズンの番号を引き継ぐ
export type SeasonNumberRow = { season: number; player_id: string; number: string };

export function resolveNumber(rows: SeasonNumberRow[], playerId: string, season: number): string | null {
  let best: SeasonNumberRow | null = null;
  for (const r of rows) {
    if (r.player_id !== playerId || r.season > season) continue;
    if (best === null || r.season > best.season) best = r;
  }
  return best?.number ?? null;
}

// 一覧の表示用。助っ人は「助」
export function displayNumber(rows: SeasonNumberRow[], playerId: string, season: number, kind: "regular" | "guest" | "manager"): string {
  if (kind === "guest") return "助";
  return resolveNumber(rows, playerId, season) ?? "";
}
