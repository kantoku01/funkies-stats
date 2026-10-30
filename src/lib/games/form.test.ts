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
      status: "completed",
      start_time: null,
      meet_time: null,
      venue: null,
      uniform: null,
      bring_bases: null,
      game_date: "2026-09-20",
      opponent: null,
      team_score: null,
      opponent_score: null,
      result: "win",
      memo: null,
      game_type: "open",
      stage: null,
      round_label: null,
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

  test("公式戦: 既存の大会・新しい大会", () => {
    const T = "30000000-0000-0000-0000-000000000001";
    const existing = parseGameForm(
      fd({ gameDate: "2026-09-20", result: "win", gameType: "official", tournamentId: T, stage: "knockout", roundLabel: "1回戦" }),
    );
    expect(existing.ok && [existing.record.game_type, existing.record.stage, existing.record.round_label, existing.tournament]).toEqual([
      "official",
      "knockout",
      "1回戦",
      { id: T },
    ]);
    const created = parseGameForm(
      fd({ gameDate: "2026-09-20", result: "win", gameType: "official", tournamentId: "new", newTournament: " 秋季　大会 ", stage: "league" }),
    );
    expect(created.ok && [created.tournament, created.record.round_label]).toEqual([{ newName: "秋季 大会" }, null]);
  });

  test("公式戦で大会・段階がないとエラー。オープン戦は大会情報を捨てる", () => {
    const r = parseGameForm(fd({ gameDate: "2026-09-20", result: "win", gameType: "official", tournamentId: "new" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["newTournament", "stage"]);
    const open = parseGameForm(fd({ gameDate: "2026-09-20", result: "win", gameType: "open", stage: "league", roundLabel: "x" }));
    expect(open.ok && [open.record.stage, open.record.round_label, open.tournament]).toEqual([null, null, null]);
  });

  test("予定の試合: 勝敗・スコアは不要で、入っていても捨てる", () => {
    const r = parseGameForm(
      fd({
        status: "scheduled",
        gameDate: "2026-11-08",
        startTime: "９:00",
        meetTime: "8時30分",
        venue: "河川敷　グラウンド",
        uniform: "白",
        bringBases: "need",
        teamScore: "3",
        result: "win",
      }),
    );
    expect(r.ok && r.record).toMatchObject({
      status: "scheduled",
      start_time: "09:00",
      meet_time: "08:30",
      venue: "河川敷 グラウンド",
      uniform: "白",
      bring_bases: true,
      team_score: null,
      result: null,
    });
  });

  test("ベース持参: 不要 / 未定", () => {
    const none = parseGameForm(fd({ status: "scheduled", gameDate: "2026-11-08", bringBases: "none" }));
    expect(none.ok && none.record.bring_bases).toBe(false);
    const unknown = parseGameForm(fd({ status: "scheduled", gameDate: "2026-11-08" }));
    expect(unknown.ok && unknown.record.bring_bases).toBeNull();
  });

  test("時刻の形式", () => {
    const r = parseGameForm(fd({ status: "scheduled", gameDate: "2026-11-08", startTime: "25:00", meetTime: "abc" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["meetTime", "startTime"]);
  });

  test("結果を入力して終了にするときは勝敗が必要", () => {
    const r = parseGameForm(fd({ status: "completed", gameDate: "2026-11-08" }));
    expect(r.ok || r.errors.result).toBe("勝敗を選んでください。");
  });
});
