import type { ScheduleDay } from "@/lib/data/schedule";
import { formatGameDate } from "@/lib/format";
import { formatGameTime, formatTime } from "@/lib/games/form";
import { gameTypeLabel } from "@/lib/games/type-label";
import { monthKey, type Month } from "./month";

// 予定・出欠ページの「LINEで送る」: 今日以降の予定をまとめた文面

export const VIDEO_URL = "https://youtube.com/channel/UCkl5EteK2qpeBFyiQ1VsxuA?feature=share";

// 1日分の文面(・11/1 のあとに続く行)。何も決まっていない日は null
function dayLines(d: ScheduleDay): string[] | null {
  const blocks: string[][] = d.games.map((g) =>
    [
      formatGameTime(g.start_time),
      gameTypeLabel(g),
      g.venue,
      `vs ${g.opponent ?? "相手未定"}`,
      g.status === "cancelled" ? "雨天中止" : null,
    ].filter((s): s is string => Boolean(s)),
  );
  if (d.games.length === 0) {
    if (d.kind === "off") blocks.push([d.note ? `オフ ${d.note}` : "オフ"]);
    else if (d.kind === "practice") blocks.push([d.note ?? "活動予定"]);
    else if (d.note) blocks.push([d.note]);
  } else if (d.note) {
    blocks.push([d.note]);
  }
  for (const e of d.events) {
    blocks.push([
      [e.start_time ? formatTime(e.start_time) : null, e.title].filter(Boolean).join(" "),
      ...(e.place ? [e.place] : []),
      ...(e.note ? [e.note] : []),
    ]);
  }
  return blocks.length > 0 ? blocks.map((b) => b.join("\n")).flatMap((b, i) => (i === 0 ? [b] : ["", b])) : null;
}

export function buildScheduleMessage(siteUrl: string, today: string, months: { month: Month; days: ScheduleDay[] }[]): string {
  const parts = [`【ファンキーズスケジュール】\n◆ファンキーズアプリ\n${siteUrl}/`, `◆試合映像\n${VIDEO_URL}`];
  for (const { month, days } of months) {
    const lines = days
      .filter((d) => d.day >= today)
      .flatMap((d) => {
        const body = dayLines(d);
        return body ? [`・${formatGameDate(d.day, false)}\n${body.join("\n")}`] : [];
      });
    if (lines.length === 0) continue;
    parts.push(`《${month.month}月》\n${siteUrl}/schedule/${monthKey(month)}`, ...lines);
  }
  return parts.join("\n\n");
}
