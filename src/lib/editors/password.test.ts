import { describe, expect, test } from "vitest";
import { temporaryPassword } from "./password";

describe("temporaryPassword", () => {
  test("12文字で、読み間違えやすい文字を含まない", () => {
    for (let i = 0; i < 50; i++) {
      const p = temporaryPassword();
      expect(p).toHaveLength(12);
      expect(p).not.toMatch(/[0O1lI]/);
    }
  });
});
