import { describe, expect, test } from "vitest";
import { formatYen } from "./categories";
import { parseLedgerForm } from "./form";
import { summarizeLedger, type LedgerEntry } from "./summary";

const A = "10000000-0000-0000-0000-00000000000a";
const B = "10000000-0000-0000-0000-00000000000b";
let n = 0;
const entry = (e: Partial<LedgerEntry> & Pick<LedgerEntry, "kind" | "category" | "amount">): LedgerEntry => ({
  id: String(++n),
  entry_date: "2026-05-01",
  season: 2026,
  memo: null,
  player_id: null,
  settled_on: null,
  game_id: null,
  ...e,
});

describe("summarizeLedger", () => {
  const entries = [
    entry({ kind: "income", category: "carryover", amount: 50000, entry_date: "2026-01-01" }),
    entry({ kind: "income", category: "dues", amount: 10000, player_id: A }),
    entry({ kind: "income", category: "dues", amount: 5000, player_id: A }),
    entry({ kind: "income", category: "dues", amount: 10000, player_id: B }),
    entry({ kind: "expense", category: "social", amount: 2000 }), // 部費から直接
    entry({ kind: "expense", category: "ground", amount: 3000, player_id: A, settled_on: "2026-05-10" }), // 精算済み
    entry({ kind: "expense", category: "ground", amount: 4000, player_id: A, entry_date: "2026-06-01" }), // 未精算
    entry({ kind: "expense", category: "equipment", amount: 6000, player_id: B, entry_date: "2026-04-01" }), // 未精算
    entry({ kind: "income", category: "other_income", amount: 1000, season: 2025, entry_date: "2025-12-01" }),
  ];
  const s = summarizeLedger(entries, 2026);

  test("残高 = 収入 − (直接払い + 精算済みの立て替え)。年をまたいで通算", () => {
    // 50000 + 10000 + 5000 + 10000 + 1000 − 2000 − 3000
    expect(s.balance).toBe(71000);
  });

  test("未精算の立て替え(人ごと、多い順)", () => {
    expect(s.pendingTotal).toBe(10000);
    expect(s.pending.map((p) => [p.playerId, p.total])).toEqual([
      [B, 6000],
      [A, 4000],
    ]);
  });

  test("その年の収入・支出(未精算も支出に含む)と年会費", () => {
    expect(s.season.income).toBe(75000);
    expect(s.season.expense).toBe(15000);
    expect(s.season.dues.get(A)).toBe(15000);
    expect(s.season.dues.get(B)).toBe(10000);
  });

  test("項目別は収入 → 支出、それぞれ多い順", () => {
    expect(s.season.byCategory.map((c) => `${c.category}:${c.total}`)).toEqual([
      "carryover:50000",
      "dues:25000",
      "ground:7000",
      "equipment:6000",
      "social:2000",
    ]);
  });

  test("記録がなければ0", () => {
    const empty = summarizeLedger([], 2026);
    expect([empty.balance, empty.pendingTotal, empty.season.income]).toEqual([0, 0, 0]);
  });
});

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

describe("parseLedgerForm", () => {
  test("部費から直接の支出(選手は持たない)", () => {
    const r = parseLedgerForm(fd({ entryDate: "2026-09-20", kind: "expense", category: "ground", amount: "3,000円", payer: "club", playerId: A }));
    expect(r.ok && r.record).toEqual({
      entry_date: "2026-09-20",
      kind: "expense",
      category: "ground",
      amount: 3000,
      memo: null,
      player_id: null,
      settled_on: null,
      game_id: null,
    });
  });

  test("立て替え(未精算・精算済み)", () => {
    const pending = parseLedgerForm(fd({ entryDate: "2026-09-20", kind: "expense", category: "ground", amount: "３０００", payer: "advance", playerId: A }));
    expect(pending.ok && [pending.record.amount, pending.record.player_id, pending.record.settled_on]).toEqual([3000, A, null]);
    const settled = parseLedgerForm(
      fd({ entryDate: "2026-09-20", kind: "expense", category: "ground", amount: "3000", payer: "advance", playerId: A, settled: "on", settledOn: "2026-09-27" }),
    );
    expect(settled.ok && settled.record.settled_on).toBe("2026-09-27");
  });

  test("年会費は納入者が必要、繰越金は選手を持たない", () => {
    const noPlayer = parseLedgerForm(fd({ entryDate: "2026-04-01", kind: "income", category: "dues", amount: "10000" }));
    expect(noPlayer.ok || noPlayer.errors.playerId).toBe("納入した選手を選んでください。");
    const carry = parseLedgerForm(fd({ entryDate: "2026-01-01", kind: "income", category: "carryover", amount: "50000", playerId: A }));
    expect(carry.ok && carry.record.player_id).toBeNull();
  });

  test("立て替えの人なし・精算日なし・金額不正・項目の取り違え", () => {
    const r = parseLedgerForm(fd({ entryDate: "2026-09-20", kind: "expense", category: "dues", amount: "0", payer: "advance", settled: "on" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["amount", "category", "playerId", "settledOn"]);
  });
});

test("formatYen", () => {
  expect(formatYen(71000)).toBe("71,000円");
  expect(formatYen(-500)).toBe("−500円");
});
