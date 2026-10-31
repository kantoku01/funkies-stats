import { describe, expect, test } from "vitest";
import {
  shiftDay,
  monthToOpen,
  parseActivityNote,
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

describe("活動予定のメモ", () => {
  test("時間と場所を取り出す", () => {
    expect(parseActivityNote("14:00〜16:00 東雲運動広場グラウンド")).toEqual({ start: "14:00", venue: "東雲運動広場グラウンド", rest: null });
    expect(parseActivityNote("9:00〜11:00 大阪城(年内最終活動日)/19:00〜 忘年会")).toEqual({
      start: "09:00",
      venue: "大阪城",
      rest: "(年内最終活動日)/19:00〜 忘年会",
    });
  });
  test("時間がなければそのまま", () => {
    expect(parseActivityNote("グラウンド未定")).toEqual({ start: null, venue: null, rest: "グラウンド未定" });
    expect(parseActivityNote(null)).toEqual({ start: null, venue: null, rest: null });
  });
});

describe("開く月", () => {
  test("今月の予定日が全部終わったら来月", () => {
    expect(monthToOpen("2026-10-31", ["2026-10-04", "2026-10-25"])).toEqual({ year: 2026, month: 11 });
    expect(monthToOpen("2026-10-25", ["2026-10-04", "2026-10-25"])).toEqual({ year: 2026, month: 10 });
    expect(monthToOpen("2026-12-28", ["2026-12-20"])).toEqual({ year: 2027, month: 1 });
  });
});

describe("shiftDay", () => {
  test("月・年をまたぐ", () => {
    expect(shiftDay("2026-10-31", 1)).toBe("2026-11-01");
    expect(shiftDay("2027-01-01", -1)).toBe("2026-12-31");
  });
});
