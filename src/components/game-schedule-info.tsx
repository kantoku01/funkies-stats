import { formatTime } from "@/lib/games/form";

export type ScheduleInfo = {
  startTime: string | null;
  meetTime: string | null;
  venue: string | null;
  uniform: string | null;
  bringBases: boolean | null;
};

// 試合予定の情報(集合・開始・場所・ユニフォーム・ベース持参)。入っている項目だけ出す
export function GameScheduleInfo({ info, className = "" }: { info: ScheduleInfo; className?: string }) {
  const rows = [
    ["集合", formatTime(info.meetTime)],
    ["開始", formatTime(info.startTime)],
    ["場所", info.venue],
    ["ユニフォーム", info.uniform],
    ["ベース持参", info.bringBases === null ? null : info.bringBases ? "必要" : "不要"],
  ].filter((r): r is [string, string] => Boolean(r[1]));
  if (rows.length === 0) return null;
  return (
    <dl className={`grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm ${className}`}>
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-slate-500">{label}</dt>
          <dd className={`font-medium ${label === "ベース持参" && value === "必要" ? "text-accent-600" : ""}`}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export const scheduleOf = (g: {
  start_time: string | null;
  meet_time: string | null;
  venue: string | null;
  uniform: string | null;
  bring_bases: boolean | null;
}): ScheduleInfo => ({
  startTime: g.start_time,
  meetTime: g.meet_time,
  venue: g.venue,
  uniform: g.uniform,
  bringBases: g.bring_bases,
});
