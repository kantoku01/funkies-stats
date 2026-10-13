import { describe, expect, test } from "vitest";
import { displayNumber, resolveNumber } from "./numbers";

const rows = [
  { season: 2026, player_id: "a", number: "0" },
  { season: 2028, player_id: "a", number: "00" },
  { season: 2026, player_id: "b", number: "11" },
];

describe("resolveNumber", () => {
  test("そのシーズンの番号があればそれを使う", () => {
    expect(resolveNumber(rows, "a", 2026)).toBe("0");
    expect(resolveNumber(rows, "a", 2028)).toBe("00");
  });
  test("なければ前のシーズンの番号を引き継ぐ", () => {
    expect(resolveNumber(rows, "a", 2027)).toBe("0");
    expect(resolveNumber(rows, "b", 2030)).toBe("11");
  });
  test("それ以前の番号もなければ null", () => {
    expect(resolveNumber(rows, "a", 2025)).toBeNull();
    expect(resolveNumber(rows, "c", 2026)).toBeNull();
  });
  test("助っ人は「助」", () => {
    expect(displayNumber(rows, "x", 2026, "guest")).toBe("助");
    expect(displayNumber(rows, "c", 2026, "regular")).toBe("");
  });
});
