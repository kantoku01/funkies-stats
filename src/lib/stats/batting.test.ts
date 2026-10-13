import { describe, expect, test } from "vitest";
import { battingLine, playerLine } from "./batting";
import { countsFromGame, emptyCounts } from "./counting";
import { formatRate } from "./ratio";

describe("countsFromGame", () => {
  test("打席結果ごとに数え、打点と盗塁(打席外を含む)を合計する", () => {
    const c = countsFromGame(
      [
        { result: "single", rbi: 0, stolen_bases: 1 },
        { result: "home_run", rbi: 2, stolen_bases: 0 },
        { result: "walk", rbi: 0, stolen_bases: 2 },
        { result: "sac_fly", rbi: 1, stolen_bases: 0 },
        { result: "out", rbi: 0, stolen_bases: 0 },
      ],
      1,
    );
    expect(c).toEqual({
      ...emptyCounts(),
      attendance: 1,
      pa: 5,
      singles: 1,
      homeRuns: 1,
      walks: 1,
      sacFlies: 1,
      rbi: 3,
      stolenBases: 4,
    });
  });

  test("打席0でも出席は1", () => {
    expect(countsFromGame([], 0)).toEqual({ ...emptyCounts(), attendance: 1 });
  });
});

describe("battingLine", () => {
  test("打数・安打・塁打数・率(要件の計算式)", () => {
    const line = battingLine({
      ...emptyCounts(),
      pa: 10,
      singles: 1,
      doubles: 1,
      triples: 1,
      homeRuns: 1,
      walks: 1,
      hbp: 1,
      sacFlies: 1,
      sacBunts: 1,
    });
    expect(line.atBats).toBe(6); // 10 - 1 - 1 - 1 - 1
    expect(line.hits).toBe(4);
    expect(line.totalBases).toBe(10); // 1 + 2 + 3 + 4
    expect(formatRate(line.avg)).toBe(".667"); // 4/6
    expect(formatRate(line.obp)).toBe(".667"); // 6/9
    expect(formatRate(line.slg)).toBe("1.667"); // 10/6
    expect(formatRate(line.ops)).toBe("2.333");
  });

  test("打席がなければすべて .000", () => {
    const line = battingLine(emptyCounts());
    expect([line.avg, line.obp, line.slg, line.ops].map(formatRate)).toEqual([".000", ".000", ".000", ".000"]);
  });

  test("打数0でも四球があれば出塁率は出る(長打率は0扱い)", () => {
    const line = battingLine({ ...emptyCounts(), pa: 2, walks: 2 });
    expect(formatRate(line.obp)).toBe("1.000");
    expect(formatRate(line.slg)).toBe(".000");
    expect(formatRate(line.ops)).toBe("1.000");
  });
});

describe("playerLine", () => {
  test("出席率 = 出席 ÷ 試合数、打撃貢献率 = 出席率 × OPS", () => {
    const line = playerLine({ ...emptyCounts(), attendance: 3, pa: 4, singles: 2 }, 4);
    expect(formatRate(line.attendanceRate)).toBe(".750");
    expect(formatRate(line.ops)).toBe("1.000"); // .500 + .500
    expect(formatRate(line.contribution)).toBe(".750");
  });
});
