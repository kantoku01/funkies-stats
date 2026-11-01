import { describe, expect, test } from "vitest";
import { costLines, costText, ourShare, parseCostForm, type GameCost } from "./costs";

const fd = (e: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(e)) f.set(k, v);
  return f;
};
const cost = (c: Partial<GameCost>): GameCost => ({
  id: "1",
  item: "umpire",
  amount: 7000,
  opponent_share: 0,
  payer: "undecided",
  player_id: null,
  memo: null,
  ledger_entry_id: null,
  ...c,
});

describe("当日のお金", () => {
  test("相手チームからの分を引いた額がこちらの負担", () => {
    expect(ourShare({ amount: 7000, opponent_share: 5000 })).toBe(2000);
    expect(costText(cost({ opponent_share: 5000 }))).toBe("審判代 7,000円(うち相手チームから 5,000円)");
  });
  test("前日の LINE の行", () => {
    const lines = costLines(
      [cost({ opponent_share: 5000 }), cost({ id: "2", item: "ground", amount: 12000, payer: "player", player_id: "p" })],
      () => "安達",
    );
    expect(lines).toEqual([
      "審判代 7,000円(うち相手チームから 5,000円) / 支払い未定",
      "グラウンド代 12,000円 / 安達さん立て替え",
      "こちらの負担 合計 14,000円",
    ]);
    expect(costLines([], () => null)).toEqual([]);
  });
  test("入力: 全角・カンマも数字にする。相手チームへの支払いに相手チームからは付かない", () => {
    const r = parseCostForm(fd({ item: "umpire", amount: "７,０００円", opponentShare: "5000", payer: "club" }));
    expect(r.ok && r.values).toEqual({ item: "umpire", amount: 7000, opponentShare: 5000, payer: "club", playerId: null, memo: null });
    const o = parseCostForm(fd({ item: "opponent", amount: "3000", opponentShare: "1000", payer: "" }));
    expect(o.ok && o.values.opponentShare).toBe(0);
    expect(parseCostForm(fd({ item: "umpire", amount: "7000", opponentShare: "8000" })).ok).toBe(false);
  });
});

describe("項目", () => {
  test("グラウンド代＋審判代は経費のグラウンド・審判代", async () => {
    const { costLedgerCategory, COST_ITEM_CHOICES } = await import("./costs");
    expect(costLedgerCategory("ground_umpire")).toBe("ground");
    expect(COST_ITEM_CHOICES).toEqual(["ground", "umpire", "ground_umpire", "opponent"]);
  });
});
