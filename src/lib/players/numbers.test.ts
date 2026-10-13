import { describe, expect, test } from "vitest";
import { findNumberConflict } from "./numbers";

const players = [
  { id: "a", full_name: "宮川", kind: "regular", left_on: null },
  { id: "b", full_name: "西岡", kind: "regular", left_on: null },
  { id: "c", full_name: "退団者", kind: "regular", left_on: "2026-12-31" },
  { id: "g", full_name: "助っ人", kind: "guest", left_on: null },
];
const rows = [
  { season: 2026, player_id: "a", number: "0" },
  { season: 2026, player_id: "b", number: "11" },
  { season: 2026, player_id: "c", number: "7" },
];

describe("findNumberConflict", () => {
  test("同じシーズンで使われている番号", () => {
    expect(findNumberConflict(rows, players, 2026, "b", "0")).toEqual({ playerId: "a", fullName: "宮川" });
  });
  test("前シーズンから引き継いだ番号とも重複扱い", () => {
    expect(findNumberConflict(rows, players, 2027, "b", "0")?.fullName).toBe("宮川");
  });
  test("\"0\" と \"00\" は別の番号", () => {
    expect(findNumberConflict(rows, players, 2026, "b", "00")).toBeNull();
  });
  test("自分自身とは重複しない", () => {
    expect(findNumberConflict(rows, players, 2026, "a", "0")).toBeNull();
  });
  test("前シーズンまでに退団した選手の番号は使える", () => {
    expect(findNumberConflict(rows, players, 2026, "a", "7")?.fullName).toBe("退団者");
    expect(findNumberConflict(rows, players, 2027, "a", "7")).toBeNull();
  });
  test("新しい選手(id なし)", () => {
    expect(findNumberConflict(rows, players, 2026, null, "11")?.fullName).toBe("西岡");
  });
});
