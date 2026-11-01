import { describe, expect, test } from "vitest";
import { buildLineMessage, shortNames, type LineMessageGame, type LineMessageMember } from "./line-message";

const game: LineMessageGame = {
  game_date: "2026-11-01",
  opponent: "忍spirit",
  start_time: "13:00:00",
  meet_time: null,
  venue: "十三公園",
  venue_map_url: "https://maps.app.goo.gl/abc",
  uniform: "青",
  bring_bases: false,
  memo: null,
  game_type: "official",
  tournament: { name: "2026スカイカップ 冬の陣" },
  stage: "league",
  round_label: null,
};

const members: LineMessageMember[] = [
  { id: "1", fullName: "小林 建太", kind: "regular", carpool: "A" },
  { id: "2", fullName: "安達 慎哉", kind: "regular", carpool: "B" },
  { id: "3", fullName: "森 陽亮", kind: "regular", carpool: "B" },
  { id: "4", fullName: "宮川 偉愛", kind: "regular", carpool: "individual" },
  { id: "5", fullName: "森 郁哉", kind: "regular", carpool: null },
];

describe("shortNames", () => {
  test("名字だけ。同じ名字は名前の1文字目を付ける", () => {
    const n = shortNames(members);
    expect([...n.values()]).toEqual(["小林", "安達", "森(陽)", "宮川", "森(郁)"]);
  });
  test("名前のない人は名字のまま", () => {
    expect([...shortNames([{ id: "1", fullName: "宮川" }]).values()]).toEqual(["宮川"]);
  });
});

describe("buildLineMessage", () => {
  test("試合情報と配車を全部入れる", () => {
    expect(buildLineMessage(game, members, shortNames(members))).toBe(
      [
        "11/1(日) 2026スカイカップ 冬の陣 予選リーグ vs 忍spirit",
        "◆球場\n十三公園\nhttps://maps.app.goo.gl/abc",
        "◆スケジュール\n12:10 球場集合\n13:00 試合開始\n15:00 試合終了",
        "◆ユニフォーム\n青",
        "◆ベース\n不要",
        "◆マネージャー\n無し",
        "◆配車\n☆配車グループA\n小林\n\n☆配車グループB\n安達\n森(陽)\n\n☆個別\n宮川\n森(郁)",
      ].join("\n\n"),
    );
  });
  test("未入力は未定、マネージャーとメモも入れる", () => {
    const text = buildLineMessage(
      { ...game, game_type: "open", tournament: null, stage: null, opponent: null, start_time: null, venue: null, venue_map_url: null, uniform: null, bring_bases: null, memo: "雨なら中止" },
      [{ id: "9", fullName: "マネ 花子", kind: "manager", carpool: null }],
      new Map(),
    );
    expect(text).toContain("11/1(日) オープン戦 vs 相手未定");
    expect(text).toContain("◆球場\n未定");
    expect(text).toContain("◆スケジュール\n未定");
    expect(text).toContain("◆ベース\n未定");
    expect(text).toContain("◆マネージャー\nマネ 花子");
    expect(text).toContain("☆個別\nマネ 花子"); // マネージャーも配車に入る
    expect(text).toContain("☆配車グループA\nなし");
    expect(text).toContain("◆メモ\n雨なら中止");
  });
});

describe("当日のお金", () => {
  test("ベースのあとに入る", () => {
    const text = buildLineMessage(game, members, shortNames(members), ["審判代 7,000円 / 支払い未定", "こちらの負担 合計 7,000円"]);
    expect(text).toContain("◆ベース\n不要\n\n◆当日のお金\n審判代 7,000円 / 支払い未定\nこちらの負担 合計 7,000円\n\n◆マネージャー");
  });
});
