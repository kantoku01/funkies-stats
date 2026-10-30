import type { LedgerCategory, LedgerKind } from "./categories";

export type LedgerEntry = {
  id: string;
  entry_date: string;
  season: number;
  kind: LedgerKind;
  category: LedgerCategory;
  amount: number;
  memo: string | null;
  player_id: string | null;
  settled_on: string | null;
  game_id: string | null;
};

// 立て替えで、まだ部費から精算していない支出
export const isPendingAdvance = (e: LedgerEntry) => e.kind === "expense" && e.player_id !== null && e.settled_on === null;

// 部費から実際にお金が出た支出(直接払い、または精算済みの立て替え)
const paidFromClub = (e: LedgerEntry) => e.kind === "expense" && (e.player_id === null || e.settled_on !== null);

export type LedgerSummary = {
  balance: number; // 今の部費の残高(全期間)
  pendingTotal: number; // 未精算の立て替えの合計
  pending: { playerId: string; total: number; entries: LedgerEntry[] }[]; // 立て替えた人ごと(多い順)
  season: {
    income: number;
    expense: number; // その年の支出(未精算の立て替えも含む)
    byCategory: { kind: LedgerKind; category: LedgerCategory; total: number }[];
    dues: Map<string, number>; // 選手ごとの年会費の納入額
  };
};

export function summarizeLedger(entries: LedgerEntry[], season: number): LedgerSummary {
  let balance = 0;
  const pendingMap = new Map<string, LedgerEntry[]>();
  for (const e of entries) {
    if (e.kind === "income") balance += e.amount;
    else if (paidFromClub(e)) balance -= e.amount;
    if (isPendingAdvance(e)) pendingMap.set(e.player_id!, [...(pendingMap.get(e.player_id!) ?? []), e]);
  }

  const pending = [...pendingMap.entries()]
    .map(([playerId, list]) => ({
      playerId,
      total: list.reduce((s, e) => s + e.amount, 0),
      entries: list.sort((a, b) => a.entry_date.localeCompare(b.entry_date)),
    }))
    .sort((a, b) => b.total - a.total);

  const inSeason = entries.filter((e) => e.season === season);
  const cat = new Map<string, { kind: LedgerKind; category: LedgerCategory; total: number }>();
  const dues = new Map<string, number>();
  for (const e of inSeason) {
    const key = `${e.kind}:${e.category}`;
    const c = cat.get(key) ?? { kind: e.kind, category: e.category, total: 0 };
    c.total += e.amount;
    cat.set(key, c);
    if (e.category === "dues" && e.player_id) dues.set(e.player_id, (dues.get(e.player_id) ?? 0) + e.amount);
  }

  return {
    balance,
    pendingTotal: pending.reduce((s, p) => s + p.total, 0),
    pending,
    season: {
      income: inSeason.filter((e) => e.kind === "income").reduce((s, e) => s + e.amount, 0),
      expense: inSeason.filter((e) => e.kind === "expense").reduce((s, e) => s + e.amount, 0),
      byCategory: [...cat.values()].sort((a, b) => (a.kind === b.kind ? b.total - a.total : a.kind === "income" ? -1 : 1)),
      dues,
    },
  };
}
