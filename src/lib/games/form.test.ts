import { describe, expect, test } from "vitest";
import { parseGameForm, resultFromScores } from "./form";

const fd = (entries: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
};

describe("resultFromScores", () => {
  test("得点から勝敗", () => {
    expect(resultFromScores("5", "3")).toBe("win");
    expect(resultFromScores("2", "3")).toBe("lose");
    expect(resultFromScores("3", "3")).toBe("draw");
    expect(resultFromScores("", "3")).toBeNull();
  });
});

describe("parseGameForm", () => {
  test("必要なのは試合日と勝敗だけ", () => {
    const r = parseGameForm(fd({ gameDate: "2026-09-20", result: "win" }));
    expect(r.ok && r.record).toEqual({
      game_date: "2026-09-20",
      opponent: null,
      team_score: null,
      opponent_score: null,
      result: "win",
      memo: null,
    });
  });

  test("全角数字の得点", () => {
    const r = parseGameForm(fd({ gameDate: "2026-09-20", teamScore: "１０", opponentScore: "2", result: "win" }));
    expect(r.ok && r.record.team_score).toBe(10);
  });

  test("スコアと勝敗が食い違うとエラー", () => {
    const r = parseGameForm(fd({ gameDate: "2026-09-20", teamScore: "1", opponentScore: "2", result: "win" }));
    expect(r.ok || r.errors.result).toBe("スコアと勝敗が合っていません。");
  });

  test("片方の得点だけなら勝敗は入力どおり(不戦勝など)", () => {
    expect(parseGameForm(fd({ gameDate: "2026-09-20", teamScore: "7", result: "win" })).ok).toBe(true);
  });

  test("必須・形式のエラー", () => {
    const r = parseGameForm(fd({ gameDate: "2026-13-01", teamScore: "-1", result: "" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["gameDate", "result", "teamScore"]);
  });
});
