import { describe, expect, test } from "vitest";
import { battingOrderSort, battingSummary, battingWarnings, validateBattingInput, type BattingEntry } from "./entry";

const e = (result: BattingEntry["result"], rbi = 0, stolenBases = 0): BattingEntry => ({ result, rbi, stolenBases });

describe("battingSummary", () => {
  test("要件の例: 4打数2安打1打点1盗塁", () => {
    expect(battingSummary([e("single", 1, 1), e("out"), e("double"), e("out")], 0)).toBe("4打数2安打1打点1盗塁");
  });
  test("四死球・犠打は打数に入れず、内訳を添える", () => {
    expect(battingSummary([e("walk"), e("sac_bunt"), e("home_run", 2)], 1)).toBe("1打数1安打1本塁打2打点1盗塁1四球1犠打");
  });
  test("打席なし", () => {
    expect(battingSummary([], 0)).toBe("打席なし");
    expect(battingSummary([], 1)).toBe("0打数0安打1盗塁");
  });
});

describe("battingWarnings", () => {
  test("本塁打・犠飛で打点0、打席が7を超える", () => {
    expect(battingWarnings([e("home_run"), e("sac_fly"), e("home_run", 1)])).toEqual([
      "1打席目: 本塁打なのに打点が0です",
      "2打席目: 犠飛なのに打点が0です",
    ]);
    expect(battingWarnings(Array.from({ length: 8 }, () => e("out")))).toEqual(["打席数が8あります(7を超えています)"]);
    expect(battingWarnings(Array.from({ length: 7 }, () => e("out")))).toEqual([]);
  });
});

describe("validateBattingInput", () => {
  test("正しい入力", () => {
    expect(validateBattingInput([e("single", 4, 3)], 3)).toEqual({ ok: true, entries: [e("single", 4, 3)], extraStolenBases: 3 });
  });
  test("範囲外・不正な値", () => {
    expect(validateBattingInput([e("single", 5)], 0).ok).toBe(false);
    expect(validateBattingInput([{ result: "strikeout", rbi: 0, stolenBases: 0 }], 0).ok).toBe(false);
    expect(validateBattingInput([e("single", 0, 4)], 0).ok).toBe(false);
    expect(validateBattingInput([e("single", 1.5)], 0).ok).toBe(false);
    expect(validateBattingInput([], 4).ok).toBe(false);
    expect(validateBattingInput("x", 0).ok).toBe(false);
    expect(validateBattingInput(Array.from({ length: 16 }, () => e("out")), 0).ok).toBe(false);
  });
});

describe("battingOrderSort", () => {
  test("打順 → 背番号 → 助っ人", () => {
    const list = [
      { name: "助っ人", number: "助", battingOrder: null },
      { name: "背番号10", number: "10", battingOrder: null },
      { name: "打順2", number: "1", battingOrder: 2 },
      { name: "背番号0", number: "0", battingOrder: null },
      { name: "打順1", number: "99", battingOrder: 1 },
      { name: "背番号00", number: "00", battingOrder: null },
    ];
    expect(battingOrderSort(list).map((p) => p.name)).toEqual(["打順1", "打順2", "背番号0", "背番号00", "背番号10", "助っ人"]);
  });
});
