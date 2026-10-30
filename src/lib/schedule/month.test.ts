import { describe, expect, test } from "vitest";
import {
  countAnswers,
  countsAsAttending,
  isSunday,
  monthKey,
  monthRange,
  parseMonth,
  scheduleDays,
  shiftMonth,
  sundaysOf,
} from "./month";

describe("月の扱い", () => {
  test("parseMonth / monthKey", () => {
    expect(parseMonth("2026-11")).toEqual({ year: 2026, month: 11 });
    expect(parseMonth("2026-13")).toBeNull();
    expect(parseMonth("2026-1")).toBeNull();
    expect(monthKey({ year: 2027, month: 1 })).toBe("2027-01");
  });
  test("前後の月(年をまたぐ)", () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });
  test("月の範囲(うるう年)", () => {
    expect(monthRange({ year: 2028, month: 2 })).toEqual({ first: "2028-02-01", last: "2028-02-29" });
  });
});

describe("日曜日", () => {
  test("2026年11月の日曜", () => {
    expect(sundaysOf({ year: 2026, month: 11 })).toEqual(["2026-11-01", "2026-11-08", "2026-11-15", "2026-11-22", "2026-11-29"]);
  });
  test("足した日付を日付順に混ぜる(その月の分だけ、重複なし)", () => {
    expect(scheduleDays({ year: 2026, month: 11 }, ["2026-11-03", "2026-11-08", "2026-12-01"])).toEqual([
      "2026-11-01",
      "2026-11-03",
      "2026-11-08",
      "2026-11-15",
      "2026-11-22",
      "2026-11-29",
    ]);
  });
  test("isSunday", () => {
    expect(isSunday("2026-11-08")).toBe(true);
    expect(isSunday("2026-11-03")).toBe(false);
  });
});

describe("回答", () => {
  test("集計", () => {
    expect(countAnswers([{ answer: "yes" }, { answer: "yes" }, { answer: "maybe" }])).toEqual({ yes: 2, maybe: 1, no: 0 });
  });
  test("○と△は参加扱い", () => {
    expect([countsAsAttending("yes"), countsAsAttending("maybe"), countsAsAttending("no"), countsAsAttending(undefined)]).toEqual([
      true,
      true,
      false,
      false,
    ]);
  });
});
