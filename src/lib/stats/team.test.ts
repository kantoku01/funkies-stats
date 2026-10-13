import { describe, expect, test } from "vitest";
import { formatRate } from "./ratio";
import { formatQualifyingPa, isQualified, teamRecord } from "./team";

describe("teamRecord", () => {
  test("初期値 + 登録した試合。勝率は引分を除く", () => {
    const t = teamRecord({ games: 30, wins: 16, losses: 14, draws: 0 }, [
      { result: "win" },
      { result: "draw" },
      { result: "lose" },
    ]);
    expect(t).toMatchObject({ games: 33, wins: 17, losses: 15, draws: 1 });
    expect(formatRate(t.winPct)).toBe(".531"); // 17/32
  });

  test("初期値なし・試合なし", () => {
    const t = teamRecord(null, []);
    expect(t.games).toBe(0);
    expect(formatRate(t.winPct)).toBe(".000");
  });
});

describe("規定打席", () => {
  test("チーム試合数 × 1.2", () => {
    expect(formatQualifyingPa(30)).toBe("36");
    expect(formatQualifyingPa(31)).toBe("37.2");
  });

  test("打席 ≥ 規定打席(小数の誤差で境界がずれない)", () => {
    expect(isQualified(36, 30)).toBe(true);
    expect(isQualified(35, 30)).toBe(false);
    // 31試合 → 37.2打席。37は未達、38は到達
    expect(isQualified(37, 31)).toBe(false);
    expect(isQualified(38, 31)).toBe(true);
    // 35 × 1.2 = 42(浮動小数だと 41.99999… になりうる)
    expect(isQualified(42, 35)).toBe(true);
  });
});
