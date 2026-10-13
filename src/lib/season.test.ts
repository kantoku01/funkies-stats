import { expect, test } from "vitest";
import { currentYearInJapan, todayInJapan } from "./season";

test("年末の深夜(UTC では前年)でも日本時間で判定する", () => {
  const newYearJst = new Date("2026-12-31T15:30:00Z"); // 2027-01-01 00:30 JST
  expect(currentYearInJapan(newYearJst)).toBe(2027);
  expect(todayInJapan(newYearJst)).toBe("2027-01-01");
});
