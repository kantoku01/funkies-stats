// 移行データ(スプレッドシート 9/13 時点)をアプリの計算で集計し、シートの値と一致することを確認する
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { computeSeason, formatQualifyingPa, formatRate, type PlayerSeasonStats } from "@/lib/stats";
import {
  REGULAR_JOINED_ON,
  TEAM_BASELINE_2026,
  baselinePlayerId,
  parseBaselineCsv,
} from "./baseline-csv";

const csv = readFileSync(new URL("../../../data/baseline-2026.csv", import.meta.url), "utf8");
const rows = parseBaselineCsv(csv);

const season = computeSeason({
  season: 2026,
  players: rows.map((r) => ({
    id: baselinePlayerId(r.index),
    full_name: r.name,
    kind: r.kind,
    joined_on: r.kind === "regular" ? REGULAR_JOINED_ON : null,
    left_on: null,
  })),
  games: [],
  participants: [],
  plateAppearances: [],
  baselines: rows.map((r) => ({ ...r, player_id: baselinePlayerId(r.index) })),
  teamBaseline: TEAM_BASELINE_2026,
});

const all = [...season.qualified, ...season.unqualified, ...season.guests];
const byName = (name: string) => all.find((p) => p.fullName === name) as PlayerSeasonStats;
const rates = (p: Pick<PlayerSeasonStats, "avg" | "obp" | "slg" | "ops">) =>
  [p.avg, p.obp, p.slg, p.ops].map(formatRate);

describe("CSV の読み込み", () => {
  test("21人(正規18・助っ人3)", () => {
    expect(rows).toHaveLength(21);
    expect(rows.filter((r) => r.kind === "regular")).toHaveLength(18);
    expect(rows.filter((r) => r.kind === "guest").every((r) => r.number === null)).toBe(true);
  });

  test("背番号は文字列のまま(\"0\" を落とさない)", () => {
    expect(rows[0]).toMatchObject({ number: "0", name: "宮川" });
  });

  test("見出しや区分がおかしければエラー", () => {
    expect(() => parseBaselineCsv("a,b\n1,2")).toThrow("見出し");
    const bad = csv.replace("0,宮川,正規", "0,宮川,幽霊");
    expect(() => parseBaselineCsv(bad)).toThrow("区分");
  });
});

describe("2026年 9/13 時点の成績がシートと一致する", () => {
  test("チーム合計(打席868・打数732・安打199・打率.272・OPS.778)", () => {
    const t = season.teamBatting;
    expect([t.pa, t.atBats, t.hits]).toEqual([868, 732, 199]);
    expect(formatRate(t.avg)).toBe(".272");
    expect(formatRate(t.ops)).toBe(".778");
  });

  test("打数 = 868 − 99 − 29 − 6 − 2", () => {
    const t = season.teamBatting;
    expect([t.walks, t.hbp, t.sacFlies, t.sacBunts]).toEqual([99, 29, 6, 2]);
  });

  test("チーム成績: 30試合 16勝14敗、規定打席36", () => {
    expect(season.team).toMatchObject({ games: 30, wins: 16, losses: 14, draws: 0 });
    expect(formatRate(season.team.winPct)).toBe(".533");
    expect(formatQualifyingPa(season.team.games)).toBe("36");
    expect(season.asOf).toBe("2026-09-13");
  });

  test("宮川選手(打率.388・出塁率.524・長打率.510・OPS 1.034)", () => {
    const p = byName("宮川");
    expect([p.games, p.attendance, p.pa, p.atBats, p.hits, p.totalBases]).toEqual([30, 20, 63, 49, 19, 25]);
    expect(rates(p)).toEqual([".388", ".524", ".510", "1.034"]);
    expect(formatRate(p.attendanceRate)).toBe(".667");
    expect(formatRate(p.contribution)).toBe(".689");
  });

  test("途中加入の毛利選手は試合数20", () => {
    const p = byName("毛利");
    expect(p.games).toBe(20);
    expect(formatRate(p.attendanceRate)).toBe(".600");
  });

  test("規定到達13人(OPS順)、規定未達5人、助っ人3人", () => {
    expect(season.qualified.map((p) => p.fullName)).toEqual([
      "宮川", "西岡", "毛利", "安達", "細見", "森 陽", "久原", "森 郁", "藪井", "長府", "黒田", "山田", "乗竹",
    ]);
    expect(season.unqualified.map((p) => p.fullName)).toEqual(["白壁", "小林", "茂木", "吉田", "喜多村"]);
    expect(season.guests.map((p) => p.fullName)).toEqual(["湯川", "けいちゃん", "北村"]);
  });

  test("助っ人の出席率は1.000", () => {
    for (const g of season.guests) expect(formatRate(g.attendanceRate)).toBe("1.000");
  });
});

describe("seed.sql が CSV と一致している", () => {
  test("生成し直していない変更がない", () => {
    const seed = readFileSync(new URL("../../../supabase/seed.sql", import.meta.url), "utf8");
    for (const r of rows) {
      expect(seed).toContain(`('${baselinePlayerId(r.index)}', '${r.name}', '${r.kind}'`);
    }
    expect(seed).toContain("(2026, 30, 16, 14, 0, '2026-09-13')");
  });
});
