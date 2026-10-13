import { expect, test } from "vitest";
import { formatGameDate } from "./format";

test("formatGameDate", () => {
  expect(formatGameDate("2026-09-20")).toBe("9/20(日)");
  expect(formatGameDate("2026-01-05")).toBe("1/5(月)");
  expect(formatGameDate("2026-09-13", false)).toBe("9/13");
});
