import "server-only";
import type { GameDetail } from "@/lib/data/detail";
import { getScheduleMonth } from "@/lib/data/schedule";
import { buildLineMessage, shortNames } from "@/lib/games/line-message";
import { countsAsAttending, parseMonth, shiftMonth } from "@/lib/schedule/month";
import { buildScheduleMessage } from "@/lib/schedule/share-message";

// 試合前日の連絡(○と△の人。名前は名字だけ、同じ名字はチーム全員で見分ける)
export async function gameDayBeforeMessage(g: GameDetail): Promise<string> {
  const day = g.gameDate;
  const { days, members } = await getScheduleMonth(parseMonth(day.slice(0, 7))!);
  const answers = days.find((x) => x.day === day)?.answers ?? {};
  const attending = members.filter(
    (m) => m.joinedOn <= day && (m.leftOn === null || m.leftOn >= day) && countsAsAttending(answers[m.id]?.answer),
  );
  return buildLineMessage(
    {
      ...g.typeInfo,
      game_date: day,
      opponent: g.opponent,
      start_time: g.schedule.startTime,
      meet_time: g.schedule.meetTime,
      venue: g.schedule.venue,
      venue_map_url: g.schedule.venueMapUrl,
      uniform: g.schedule.uniform,
      bring_bases: g.schedule.bringBases,
      memo: g.memo,
    },
    attending.map((m) => ({ id: m.id, fullName: m.name, kind: m.kind, carpool: m.carpool })),
    shortNames(members.map((m) => ({ id: m.id, fullName: m.name }))),
  );
}

// 今日以降のスケジュール(今月から3か月分。何も決まっていない月は出さない)
export async function scheduleMessage(siteUrl: string, today: string): Promise<string> {
  const first = parseMonth(today.slice(0, 7))!;
  const months = await Promise.all(
    [0, 1, 2].map(async (i) => {
      const month = shiftMonth(first, i);
      return { month, days: (await getScheduleMonth(month)).days };
    }),
  );
  return buildScheduleMessage(siteUrl, today, months);
}

// 本番の URL(Vercel が入れる環境変数)。手元では localhost
export function siteUrl(): string {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return host ? `https://${host}` : "http://localhost:3000";
}
