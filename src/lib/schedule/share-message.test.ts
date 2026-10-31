import { describe, expect, test } from "vitest";
import type { ScheduleDay } from "@/lib/data/schedule";
import { buildScheduleMessage, VIDEO_URL } from "./share-message";

const day = (d: Partial<ScheduleDay> & { day: string }): ScheduleDay => ({
  kind: "tbd",
  note: null,
  extra: false,
  games: [],
  answers: {},
  events: [],
  ...d,
});

const game = {
  id: "g1",
  opponent: "忍spirit",
  status: "scheduled" as const,
  result: null,
  team_score: null,
  opponent_score: null,
  start_time: "13:00:00",
  meet_time: null,
  venue: "十三公園",
  game_type: "official" as const,
  stage: "league" as const,
  round_label: null,
  tournament: { name: "2026スカイカップ 冬の陣" },
};

describe("buildScheduleMessage", () => {
  test("今日以降の予定を月ごとに並べる", () => {
    const text = buildScheduleMessage("https://example.com", "2026-11-01", [
      {
        month: { year: 2026, month: 11 },
        days: [
          day({ day: "2026-10-25", kind: "practice", note: "過去" }),
          day({ day: "2026-11-01", games: [game] }),
          day({ day: "2026-11-15", kind: "practice", note: "14:00〜16:00 東雲運動広場グラウンド" }),
          day({ day: "2026-11-22", kind: "off" }),
          day({ day: "2026-11-29" }), // 何も決まっていない日は出さない
        ],
      },
      {
        month: { year: 2026, month: 12 },
        days: [
          day({
            day: "2026-12-20",
            kind: "practice",
            note: "9:00〜11:00 大阪城(年内最終活動日)",
            events: [{ id: "e", title: "忘年会🍺", start_time: "19:00:00", place: "といとい スカイカップコース", answers: {} }],
          }),
        ],
      },
      { month: { year: 2027, month: 1 }, days: [day({ day: "2027-01-03" })] }, // 何もない月は出さない
    ]);
    expect(text).toBe(
      [
        "【ファンキーズスケジュール】\n◆ファンキーズアプリ\nhttps://example.com/",
        `◆試合映像\n${VIDEO_URL}`,
        "《11月》\nhttps://example.com/schedule/2026-11",
        "・11/1\n13:00〜15:00\n2026スカイカップ 冬の陣 予選リーグ\n十三公園\nvs 忍spirit",
        "・11/15\n14:00〜16:00 東雲運動広場グラウンド",
        "・11/22\nオフ",
        "《12月》\nhttps://example.com/schedule/2026-12",
        "・12/20\n9:00〜11:00 大阪城(年内最終活動日)\n\n19:00 忘年会🍺\nといとい スカイカップコース",
      ].join("\n\n"),
    );
  });
});
