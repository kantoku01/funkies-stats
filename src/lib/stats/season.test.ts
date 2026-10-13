import { describe, expect, test } from "vitest";
import { formatRate } from "./ratio";
import { computeSeason, defaultSeason, type SeasonInput } from "./season";

const base: SeasonInput = {
  season: 2027,
  players: [
    { id: "reg", full_name: "正規 一郎", kind: "regular", joined_on: "2026-01-01", left_on: null },
    { id: "mid", full_name: "途中 加入", kind: "regular", joined_on: "2027-05-01", left_on: null },
    { id: "left", full_name: "退団 済", kind: "regular", joined_on: "2026-01-01", left_on: "2027-04-30" },
    { id: "old", full_name: "去年 退団", kind: "regular", joined_on: "2025-01-01", left_on: "2026-12-31" },
    { id: "new", full_name: "来年 加入", kind: "regular", joined_on: "2028-01-01", left_on: null },
    { id: "guest", full_name: "助っ人 太郎", kind: "guest", joined_on: null, left_on: null },
    { id: "guest2", full_name: "未出場 助っ人", kind: "guest", joined_on: null, left_on: null },
  ],
  games: [
    { id: "g1", game_date: "2027-04-10", result: "win" },
    { id: "g2", game_date: "2027-05-10", result: "lose" },
    { id: "g3", game_date: "2027-06-10", result: "draw" },
  ],
  participants: [
    { game_id: "g1", player_id: "reg", extra_stolen_bases: 0 },
    { game_id: "g2", player_id: "reg", extra_stolen_bases: 1 },
    { game_id: "g3", player_id: "reg", extra_stolen_bases: 0 },
    { game_id: "g2", player_id: "mid", extra_stolen_bases: 0 },
    { game_id: "g1", player_id: "left", extra_stolen_bases: 0 },
    { game_id: "g3", player_id: "guest", extra_stolen_bases: 0 },
  ],
  plateAppearances: [
    { game_id: "g1", player_id: "reg", result: "single", rbi: 1, stolen_bases: 1 },
    { game_id: "g1", player_id: "reg", result: "out", rbi: 0, stolen_bases: 0 },
    { game_id: "g2", player_id: "reg", result: "double", rbi: 0, stolen_bases: 0 },
    { game_id: "g2", player_id: "reg", result: "walk", rbi: 0, stolen_bases: 0 },
    { game_id: "g3", player_id: "reg", result: "out", rbi: 0, stolen_bases: 0 },
    { game_id: "g2", player_id: "mid", result: "home_run", rbi: 1, stolen_bases: 0 },
    { game_id: "g1", player_id: "left", result: "out", rbi: 0, stolen_bases: 0 },
    { game_id: "g3", player_id: "guest", result: "triple", rbi: 2, stolen_bases: 0 },
  ],
  baselines: [],
  teamBaseline: null,
};

const find = (s: ReturnType<typeof computeSeason>, id: string) =>
  [...s.qualified, ...s.unqualified, ...s.guests].find((p) => p.playerId === id);

describe("computeSeason", () => {
  const s = computeSeason(base);

  test("チーム成績と時点", () => {
    expect(s.team).toMatchObject({ games: 3, wins: 1, losses: 1, draws: 1 });
    expect(formatRate(s.team.winPct)).toBe(".500");
    expect(s.asOf).toBe("2027-06-10");
  });

  test("正規メンバーの試合数は在籍期間中のチーム試合数", () => {
    expect(find(s, "reg")?.games).toBe(3);
    expect(find(s, "mid")?.games).toBe(2); // 5/1 加入 → g2, g3
    expect(find(s, "left")?.games).toBe(1); // 4/30 退団 → g1 のみ
  });

  test("助っ人の試合数は出席数(出席率は常に1.000)", () => {
    const g = find(s, "guest")!;
    expect(g.games).toBe(1);
    expect(formatRate(g.attendanceRate)).toBe("1.000");
  });

  test("集計値", () => {
    const r = find(s, "reg")!;
    expect(r).toMatchObject({ attendance: 3, pa: 5, atBats: 4, hits: 2, totalBases: 3, rbi: 1, stolenBases: 2 });
    expect(formatRate(r.avg)).toBe(".500");
    expect(formatRate(r.obp)).toBe(".600");
    expect(formatRate(r.slg)).toBe(".750");
    expect(formatRate(r.ops)).toBe("1.350");
  });

  test("規定打席は 3 × 1.2 = 3.6。到達者・未達・助っ人に分かれる", () => {
    expect(s.qualified.map((p) => p.playerId)).toEqual(["reg"]);
    // 未達は OPS 降順(mid: 本塁打で OPS 5.000 / left: .000)
    expect(s.unqualified.map((p) => p.playerId)).toEqual(["mid", "left"]);
    // 助っ人は規定判定の対象外。出場していない助っ人は出さない
    expect(s.guests.map((p) => p.playerId)).toEqual(["guest"]);
    expect(find(s, "guest")?.qualified).toBe(false);
  });

  test("シーズン外に在籍していた/これから加入する選手は出さない", () => {
    expect(find(s, "old")).toBeUndefined();
    expect(find(s, "new")).toBeUndefined();
  });

  test("在籍中なら記録がなくても規定未達に出る", () => {
    const s2 = computeSeason({ ...base, participants: [], plateAppearances: [] });
    expect(s2.unqualified.map((p) => p.playerId)).toEqual(expect.arrayContaining(["reg", "mid", "left"]));
    expect(s2.guests).toEqual([]);
  });

  test("チーム打撃は助っ人を含む全員の合計", () => {
    expect(s.teamBatting).toMatchObject({ pa: 8, atBats: 7, hits: 4, totalBases: 10, rbi: 4 });
  });
});

describe("初期値", () => {
  test("選手・チームの初期値に試合の記録を足す", () => {
    const s = computeSeason({
      ...base,
      season: 2026,
      games: [{ id: "g1", game_date: "2026-09-20", result: "win" }],
      participants: [{ game_id: "g1", player_id: "reg", extra_stolen_bases: 0 }],
      plateAppearances: [{ game_id: "g1", player_id: "reg", result: "single", rbi: 0, stolen_bases: 0 }],
      baselines: [
        {
          player_id: "reg",
          games: 30,
          attendance: 20,
          pa: 63,
          singles: 14,
          doubles: 4,
          triples: 1,
          home_runs: 0,
          walks: 10,
          hbp: 4,
          sac_flies: 0,
          sac_bunts: 0,
          rbi: 7,
          stolen_bases: 18,
        },
      ],
      teamBaseline: { games: 30, wins: 16, losses: 14, draws: 0, as_of: "2026-09-13" },
    });
    expect(s.team).toMatchObject({ games: 31, wins: 17, losses: 14 });
    expect(s.asOf).toBe("2026-09-20");
    expect(find(s, "reg")).toMatchObject({ games: 31, attendance: 21, pa: 64, singles: 15, stolenBases: 18 });
  });

  test("試合がなければ時点は初期値の as_of", () => {
    const s = computeSeason({
      ...base,
      season: 2026,
      games: [],
      participants: [],
      plateAppearances: [],
      teamBaseline: { games: 30, wins: 16, losses: 14, draws: 0, as_of: "2026-09-13" },
    });
    expect(s.asOf).toBe("2026-09-13");
  });
});

describe("defaultSeason", () => {
  test("試合のある最新シーズン。なければ指定の年", () => {
    expect(defaultSeason([2026, 2027], 2028)).toBe(2027);
    expect(defaultSeason([], 2028)).toBe(2028);
  });
});
