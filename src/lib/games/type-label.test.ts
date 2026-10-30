import { describe, expect, test } from "vitest";
import { gameTypeLabel, matchesFilter, parseGameFilter } from "./type-label";

const T = "30000000-0000-0000-0000-000000000001";

describe("gameTypeLabel", () => {
  test("オープン戦", () => {
    expect(gameTypeLabel({ game_type: "open", stage: null, round_label: null, tournament: null })).toBe("オープン戦");
  });
  test("公式戦は 大会 段階 回戦", () => {
    expect(gameTypeLabel({ game_type: "official", stage: "knockout", round_label: "1回戦", tournament: { name: "市民大会" } })).toBe(
      "市民大会 決勝トーナメント 1回戦",
    );
    expect(gameTypeLabel({ game_type: "official", stage: "league", round_label: null, tournament: { name: "市民大会" } })).toBe(
      "市民大会 予選リーグ",
    );
  });
});

describe("parseGameFilter / matchesFilter", () => {
  test("値の読み取り。不正な値は全試合", () => {
    expect(parseGameFilter("official").kind).toBe("official");
    expect(parseGameFilter(`t-${T}`)).toEqual({ key: `t-${T}`, kind: "tournament", tournamentId: T });
    expect(parseGameFilter("t-xxx").kind).toBe("all");
    expect(parseGameFilter(undefined).kind).toBe("all");
  });
  test("絞り込み", () => {
    const official = { game_type: "official" as const, tournament_id: T };
    const open = { game_type: "open" as const, tournament_id: null };
    expect(matchesFilter(official, parseGameFilter("official"))).toBe(true);
    expect(matchesFilter(open, parseGameFilter("official"))).toBe(false);
    expect(matchesFilter(open, parseGameFilter("open"))).toBe(true);
    expect(matchesFilter(official, parseGameFilter(`t-${T}`))).toBe(true);
    expect(matchesFilter(open, parseGameFilter("all"))).toBe(true);
  });
});
