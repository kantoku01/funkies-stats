import { describe, expect, test } from "vitest";
import { enrolledOn, planParticipants } from "./participants";

describe("planParticipants", () => {
  test("追加・打順の更新・外す選手", () => {
    const plan = planParticipants(
      ["a", "b", "c"],
      [
        { playerId: "a", battingOrder: "1" },
        { playerId: "b", battingOrder: "" },
        { playerId: "d", battingOrder: "２" },
      ],
    );
    expect(plan).toEqual({
      ok: true,
      upserts: [
        { player_id: "a", batting_order: 1 },
        { player_id: "b", batting_order: null },
        { player_id: "d", batting_order: 2 },
      ],
      deletes: ["c"],
    });
  });

  test("打順の重複と範囲外はエラー", () => {
    const plan = planParticipants([], [
      { playerId: "a", battingOrder: "1" },
      { playerId: "b", battingOrder: "1" },
      { playerId: "c", battingOrder: "31" },
    ]);
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(Object.keys(plan.errors).sort()).toEqual(["a", "b", "c"]);
  });

  test("全員外すこともできる", () => {
    expect(planParticipants(["a"], [])).toEqual({ ok: true, upserts: [], deletes: ["a"] });
  });
});

describe("enrolledOn", () => {
  const p = { kind: "regular", joined_on: "2026-05-01", left_on: "2026-08-31" };
  test("加入日〜退団日の間だけ在籍", () => {
    expect(enrolledOn(p, "2026-04-30")).toBe(false);
    expect(enrolledOn(p, "2026-05-01")).toBe(true);
    expect(enrolledOn(p, "2026-08-31")).toBe(true);
    expect(enrolledOn(p, "2026-09-01")).toBe(false);
    expect(enrolledOn({ ...p, kind: "guest" }, "2026-06-01")).toBe(false);
  });
});
