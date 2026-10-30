import { describe, expect, test } from "vitest";
import { currentStreak, topRanks } from "./ranking";

const p = (name: string, v: number) => ({ name, v });
const names = (groups: { rank: number; items: { name: string }[] }[]) =>
  groups.map((g) => `${g.rank}:${g.items.map((i) => i.name).join(",")}`);

describe("topRanks", () => {
  test("上位3位まで", () => {
    expect(names(topRanks([p("a", 5), p("b", 9), p("c", 7), p("d", 1)], (x) => x.v))).toEqual(["1:b", "2:c", "3:a"]);
  });

  test("同率は全員載せ、次の順位はとばす(1・2・2・4)", () => {
    const g = topRanks([p("a", 9), p("b", 7), p("c", 7), p("d", 5)], (x) => x.v);
    expect(names(g)).toEqual(["1:a", "2:b,c"]);
  });

  test("3位が同率なら全員", () => {
    const g = topRanks([p("a", 9), p("b", 8), p("c", 5), p("d", 5), p("e", 5), p("f", 1)], (x) => x.v);
    expect(names(g)).toEqual(["1:a", "2:b", "3:c,d,e"]);
  });

  test("1位が4人なら1位だけ", () => {
    const g = topRanks([p("a", 3), p("b", 3), p("c", 3), p("d", 3), p("e", 2)], (x) => x.v);
    expect(names(g)).toEqual(["1:a,b,c,d"]);
  });

  test("0は除く指定", () => {
    expect(names(topRanks([p("a", 2), p("b", 0)], (x) => x.v, { excludeZero: true }))).toEqual(["1:a"]);
    expect(topRanks([p("a", 0)], (x) => x.v, { excludeZero: true })).toEqual([]);
  });

  test("同率内の並びを指定できる", () => {
    const g = topRanks([p("い", 1), p("あ", 1)], (x) => x.v, { tieBreak: (a, b) => a.name.localeCompare(b.name, "ja") });
    expect(names(g)).toEqual(["1:あ,い"]);
  });
});

describe("currentStreak", () => {
  test("連勝・連敗(引き分けは挟んでも続く)", () => {
    expect(currentStreak(["win", "win", "lose"])).toEqual({ kind: "win", count: 2 });
    expect(currentStreak(["lose", "draw", "lose", "lose", "win"])).toEqual({ kind: "lose", count: 3 });
  });
  test("1試合だけ・試合なしは出さない", () => {
    expect(currentStreak(["win", "lose"])).toBeNull();
    expect(currentStreak([])).toBeNull();
    expect(currentStreak(["draw"])).toBeNull();
  });
});
