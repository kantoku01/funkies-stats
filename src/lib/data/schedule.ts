import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { monthRange, scheduleDays, type Answer, type Month } from "@/lib/schedule/month";
import { resolveNumber } from "@/lib/stats";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import type { GameResult, GameStatus } from "@/types/database";
import { fetchAll } from "./fetch-all";
import { STATS_TAG } from "./stats";

// 予定・出欠のキャッシュタグ。回答や予定を書き換えたら updateTag(SCHEDULE_TAG) を呼ぶ
export const SCHEDULE_TAG = "schedule";

export type ScheduleMember = { id: string; name: string; number: string; kind: "regular" | "manager"; joinedOn: string; leftOn: string | null };

export type ScheduleDay = {
  day: string;
  kind: "practice" | "off" | "tbd";
  note: string | null;
  extra: boolean;
  games: {
    id: string;
    opponent: string | null;
    status: GameStatus;
    result: GameResult | null;
    team_score: number | null;
    opponent_score: number | null;
    start_time: string | null;
    meet_time: string | null;
    venue: string | null;
    game_type: "open" | "official";
    stage: "league" | "knockout" | null;
    round_label: string | null;
    tournament: { name: string } | null;
  }[];
  answers: Record<string, { answer: Answer; comment: string | null }>; // player_id → 回答
  events: ScheduleEvent[]; // その日の別の予定(忘年会など)。出欠は別に集計する
};

export type ScheduleEvent = {
  id: string;
  title: string;
  start_time: string | null;
  place: string | null;
  answers: Record<string, { answer: Answer; comment: string | null }>;
};

export type ScheduleMonth = { days: ScheduleDay[]; members: ScheduleMember[] };

// 月の予定と出欠(誰でも閲覧)
export async function getScheduleMonth(m: Month): Promise<ScheduleMonth> {
  "use cache";
  cacheTag(SCHEDULE_TAG, STATS_TAG);
  cacheLife("minutes");

  const { first, last } = monthRange(m);
  const supabase = createPublicClient();
  const [dates, games, answers, players, numbers, events, eventAnswers] = await Promise.all([
    fetchAll((from, to) =>
      supabase.from("schedule_dates").select("day, kind, note, extra").gte("day", first).lte("day", last).order("day").range(from, to),
    ),
    fetchAll((from, to) =>
      supabase
        .from("games")
        .select(
          "id, game_date, opponent, status, result, team_score, opponent_score, start_time, meet_time, venue, game_type, stage, round_label, tournament:tournaments(name)",
        )
        .gte("game_date", first)
        .lte("game_date", last)
        .order("game_date")
        .order("start_time", { nullsFirst: false })
        .order("created_at")
        .range(from, to),
    ),
    fetchAll((from, to) =>
      supabase
        .from("attendance_answers")
        .select("day, player_id, answer, comment")
        .gte("day", first)
        .lte("day", last)
        .order("day")
        .order("player_id")
        .range(from, to),
    ),
    fetchAll((from, to) =>
      supabase
        .from("players")
        .select("id, full_name, kind, joined_on, left_on")
        .in("kind", ["regular", "manager"])
        .lte("joined_on", last)
        .order("id")
        .range(from, to),
    ),
    fetchAll((from, to) =>
      supabase.from("season_numbers").select("season, player_id, number").lte("season", m.year).order("season").range(from, to),
    ),
    fetchAll((from, to) =>
      supabase
        .from("schedule_events")
        .select("id, day, title, start_time, place")
        .gte("day", first)
        .lte("day", last)
        .order("day")
        .order("start_time", { nullsFirst: false })
        .order("created_at")
        .range(from, to),
    ),
    fetchAll((from, to) =>
      supabase
        .from("event_answers")
        .select("event_id, player_id, answer, comment, schedule_events!inner(day)")
        .gte("schedule_events.day", first)
        .lte("schedule_events.day", last)
        .order("event_id")
        .order("player_id")
        .range(from, to),
    ),
  ]);

  // その月に在籍している正規メンバーとマネージャー(背番号順、マネージャーは後ろ)
  const members: ScheduleMember[] = players
    .filter((p) => p.joined_on !== null && (p.left_on === null || p.left_on >= first))
    .map((p) => ({
      id: p.id,
      name: p.full_name,
      number: resolveNumber(numbers, p.id, m.year) ?? "",
      kind: p.kind as "regular" | "manager",
      joinedOn: p.joined_on!,
      leftOn: p.left_on,
    }))
    .sort(
      (a, b) =>
        (a.kind === "manager" ? 1 : 0) - (b.kind === "manager" ? 1 : 0) ||
        (a.number === "" ? 1 : 0) - (b.number === "" ? 1 : 0) ||
        Number(a.number) - Number(b.number) ||
        a.number.length - b.number.length ||
        a.name.localeCompare(b.name, "ja"),
    );

  const byDay = new Map(dates.map((d) => [d.day, d]));
  const days = scheduleDays(
    m,
    dates.filter((d) => d.extra).map((d) => d.day),
  ).map((day) => {
    const d = byDay.get(day);
    return {
      day,
      kind: d?.kind ?? "tbd",
      note: d?.note ?? null,
      extra: d?.extra ?? false,
      games: games.filter((g) => g.game_date === day),
      answers: Object.fromEntries(
        answers.filter((a) => a.day === day).map((a) => [a.player_id, { answer: a.answer, comment: a.comment }]),
      ),
      events: events
        .filter((e) => e.day === day)
        .map((e) => ({
          id: e.id,
          title: e.title,
          start_time: e.start_time,
          place: e.place,
          answers: Object.fromEntries(
            eventAnswers.filter((a) => a.event_id === e.id).map((a) => [a.player_id, { answer: a.answer, comment: a.comment }]),
          ),
        })),
    } satisfies ScheduleDay;
  });

  return { days, members };
}

// 参加者登録用: その日の回答(player_id → 回答)
export async function getAnswersForDay(day: string): Promise<Map<string, Answer>> {
  const supabase = await createClient();
  const rows = await fetchAll((from, to) =>
    supabase.from("attendance_answers").select("player_id, answer").eq("day", day).order("player_id").range(from, to),
  );
  return new Map(rows.map((r) => [r.player_id, r.answer]));
}
