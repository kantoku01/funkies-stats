import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { EditorOnly } from "@/components/editor-only";
import { gameTypeLabel } from "@/lib/games/type-label";
import { formatGameTime, formatTime } from "@/lib/games/form";
import { getScheduleMonth, type ScheduleDay, type ScheduleEvent, type ScheduleMember } from "@/lib/data/schedule";
import { formatGameDate, RESULT_LABEL } from "@/lib/format";
import {
  ANSWER_MARK,
  countAnswers,
  monthKey,
  monthRange,
  parseMonth,
  shiftMonth,
  type Answer,
} from "@/lib/schedule/month";
import { buildScheduleMessage } from "@/lib/schedule/share-message";
import { todayInJapan } from "@/lib/season";
import { AnswerForm } from "./answer-form";
import { AddDateForm, DayEditor } from "./day-editor";
import { EventEditor } from "./event-editor";
import { ShareButtons } from "./share-buttons";

// LINE に貼ったときのプレビュー: 「11月の予定・出欠|ファンキーズ」
export async function generateMetadata({ params }: PageProps<"/schedule/[month]">): Promise<Metadata> {
  const m = parseMonth((await params).month);
  if (!m) return {};
  const title = `${m.month}月の予定・出欠`;
  const description = "名前を選んで、日曜ごとに ○△× で回答してください。";
  return { title, description, openGraph: { title: `${title}|ファンキーズ`, description } };
}

export default function SchedulePage({ params }: PageProps<"/schedule/[month]">) {
  return (
    <Suspense fallback={<p className="text-slate-500">読み込み中…</p>}>
      <ScheduleView params={params} />
    </Suspense>
  );
}

const KIND_LABEL = { practice: "活動予定", off: "休み", tbd: "未定" } as const;

// 休みの日(試合が入っていない)は回答を受け付けない
const isClosed = (d: ScheduleDay) => d.kind === "off" && d.games.length === 0;

// 試合1つを1行で。同じ日に複数あれば「第1試合」「第2試合」
function gameText(g: ScheduleDay["games"][number], i: number, total: number): string {
  return [
    total > 1 ? `第${i + 1}試合` : "試合",
    g.opponent ? `vs ${g.opponent}` : "(相手未定)",
    g.status === "completed" && g.result
      ? `${RESULT_LABEL[g.result]}${g.team_score !== null && g.opponent_score !== null ? ` ${g.team_score}-${g.opponent_score}` : ""}`
      : g.status === "cancelled"
        ? "雨天中止"
        : null,
    formatGameTime(g.start_time),
    g.venue,
    g.game_type === "official" ? gameTypeLabel(g) : null,
  ]
    .filter(Boolean)
    .join(" ");
}

// 日付の予定を1行で(試合があれば試合を優先)
function eventText(d: ScheduleDay): string {
  if (d.games.length > 0) return d.games.map((g, i) => gameText(g, i, d.games.length)).join(" / ");
  return [KIND_LABEL[d.kind], d.note].filter(Boolean).join(" ");
}

// 試合の予定・結果を枠で囲んで出す
function GameBox({ game: g, index, total }: { game: ScheduleDay["games"][number]; index: number; total: number }) {
  const score = g.team_score !== null && g.opponent_score !== null ? ` ${g.team_score}-${g.opponent_score}` : "";
  const sub = [formatGameTime(g.start_time), g.venue, g.game_type === "official" ? gameTypeLabel(g) : null].filter(Boolean).join(" ");
  return (
    <div className="rounded-md border border-accent-200 bg-accent-50">
      <Link href={`/games/${g.id}`} className="block px-3 py-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-bold text-accent-600">
            {total > 1 ? `第${index + 1}試合` : "試合"} {g.opponent ? `vs ${g.opponent}` : "(相手未定)"}
          </span>
          <span className={`shrink-0 text-sm font-bold ${g.status === "completed" && g.result ? RESULT_COLOR[g.result] : "text-slate-400"}`}>
            {g.status === "completed" && g.result ? `${RESULT_LABEL[g.result]}${score}` : g.status === "cancelled" ? "雨天中止" : "予定"} ›
          </span>
        </div>
        {sub && <p className="text-sm text-slate-600">{sub}</p>}
      </Link>
      <EditorOnly>
        <div className="border-t border-accent-200 px-3 py-1 text-right">
          <Link href={`/admin/games/${g.id}/edit`} className="text-sm text-brand-700">
            {g.opponent ? "試合を編集" : "相手・内容を入れる"} ›
          </Link>
        </div>
      </EditorOnly>
    </div>
  );
}

// 別の予定の時間・場所
function eventDetail(e: ScheduleEvent): string {
  return [e.start_time ? `${formatTime(e.start_time)}〜` : null, e.place].filter(Boolean).join(" ");
}

// 別の予定(忘年会など)を枠で囲み、出欠を別に集計して出す
function EventBox({ day, event: e, active }: { day: string; event: ScheduleEvent; active: ScheduleMember[] }) {
  const answered = active.filter((mem) => e.answers[mem.id]);
  const counts = countAnswers(answered.map((mem) => e.answers[mem.id]));
  const detail = eventDetail(e);
  return (
    <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-bold text-amber-800">{e.title}</span>
        <span className="shrink-0 text-sm tabular-nums">
          <span className="font-bold text-red-600">○{counts.yes}</span>{" "}
          <span className="font-bold text-amber-600">△{counts.maybe}</span>{" "}
          <span className="font-bold text-slate-500">×{counts.no}</span>{" "}
          <span className="text-xs text-slate-400">未{active.length - answered.length}</span>
        </span>
      </div>
      {detail && <p className="text-sm text-slate-700">{detail}</p>}
      {answered.length > 0 && (
        <details className="mt-1 text-sm">
          <summary className="cursor-pointer text-slate-500">回答した人を見る</summary>
          <AnswerNames answered={answered} answers={e.answers} />
        </details>
      )}
      <EditorOnly>
        <div className="mt-1 border-t border-amber-200 pt-1">
          <EventEditor
            day={day}
            event={{ id: e.id, title: e.title, startTime: e.start_time?.slice(0, 5) ?? "", place: e.place ?? "" }}
          />
        </div>
      </EditorOnly>
    </div>
  );
}

// ○△× ごとに回答した人の名前(コメント付き)
function AnswerNames({
  answered,
  answers,
}: {
  answered: ScheduleMember[];
  answers: Record<string, { answer: Answer; comment: string | null }>;
}) {
  return (
    <ul className="mt-1 space-y-0.5">
      {(["yes", "maybe", "no"] as const).map((a) => {
        const who = answered.filter((mem) => answers[mem.id].answer === a);
        if (who.length === 0) return null;
        return (
          <li key={a}>
            <span className="mr-1 font-bold">{ANSWER_MARK[a]}</span>
            {who.map((mem) => (answers[mem.id].comment ? `${mem.name}(${answers[mem.id].comment})` : mem.name)).join("、")}
          </li>
        );
      })}
    </ul>
  );
}

const RESULT_COLOR = { win: "text-red-600", lose: "text-brand-600", draw: "text-slate-500" } as const;

// 「LINEで送る」の文面: 今日以降の予定(今月から3か月分。何も決まっていない月は出さない)
async function ScheduleShare() {
  await connection();
  const today = todayInJapan(new Date());
  const h = await headers();
  const siteUrl = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const first = parseMonth(today.slice(0, 7))!;
  const months = await Promise.all(
    [0, 1, 2].map(async (i) => {
      const month = shiftMonth(first, i);
      return { month, days: (await getScheduleMonth(month)).days };
    }),
  );
  return <ShareButtons message={buildScheduleMessage(siteUrl, today, months)} />;
}

async function ScheduleView({ params }: { params: PageProps<"/schedule/[month]">["params"] }) {
  const m = parseMonth((await params).month);
  if (!m) notFound();
  const { days, members } = await getScheduleMonth(m);
  const { first, last } = monthRange(m);
  const prev = monthKey(shiftMonth(m, -1));
  const next = monthKey(shiftMonth(m, 1));

  // その日に在籍していたメンバーだけを数える
  const activeOn = (mem: ScheduleMember, day: string) => mem.joinedOn <= day && (mem.leftOn === null || mem.leftOn >= day);
  // 回答する対象: 休みでない日 + 別の予定(忘年会など)。別の予定のキーは "e:<id>"
  const targets = days.flatMap((d) => [
    ...(isClosed(d) ? [] : [{ key: d.day, day: d.day, label: formatGameDate(d.day), short: formatGameDate(d.day, false), event: eventText(d), answers: d.answers }]),
    ...d.events.map((e) => ({
      key: `e:${e.id}`,
      day: d.day,
      label: `${formatGameDate(d.day)} ${e.title}`,
      short: `${formatGameDate(d.day, false)} ${e.title}`,
      event: eventDetail(e),
      answers: e.answers,
    })),
  ]);
  const current: Record<string, Record<string, { answer: Answer; comment: string | null }>> = {};
  for (const t of targets) {
    for (const [pid, a] of Object.entries(t.answers)) (current[pid] ??= {})[t.key] = a;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-1">
        <Link href={`/schedule/${prev}`} className="flex min-h-11 shrink-0 items-center px-1 text-sm text-brand-700">
          ‹ {shiftMonth(m, -1).month}月
        </Link>
        <h1 className="text-center text-lg font-bold">
          <span className="block text-xs font-normal text-slate-500">{m.year}年</span>
          {m.month}月の予定・出欠
        </h1>
        <Link href={`/schedule/${next}`} className="flex min-h-11 shrink-0 items-center px-1 text-sm text-brand-700">
          {shiftMonth(m, 1).month}月 ›
        </Link>
      </div>

      <Suspense fallback={<div className="min-h-11" />}>
        <ScheduleShare />
      </Suspense>

      {/* 日付ごとの予定と集計 */}
      <ul className="space-y-2">
        {days.map((d) => {
          const active = members.filter((mem) => activeOn(mem, d.day));
          const answered = active.filter((mem) => d.answers[mem.id]);
          const counts = countAnswers(answered.map((mem) => d.answers[mem.id]));
          const hasGame = d.games.length > 0;
          const closed = isClosed(d);
          const yesPlayers = answered.filter((mem) => mem.kind === "regular" && d.answers[mem.id].answer === "yes").length;
          const yesManagers = counts.yes - yesPlayers;
          return (
            <li key={d.day} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-lg font-bold tabular-nums">{formatGameDate(d.day)}</span>
                {!closed && (
                  <span className="text-sm tabular-nums">
                    <span className="font-bold text-red-600">○{counts.yes}</span>{" "}
                    <span className="font-bold text-amber-600">△{counts.maybe}</span>{" "}
                    <span className="font-bold text-slate-500">×{counts.no}</span>{" "}
                    <span className="text-xs text-slate-400">未{active.length - answered.length}</span>
                  </span>
                )}
              </div>
              {!closed && counts.yes > 0 && (
                <p className="text-right text-xs text-red-600 tabular-nums">
                  ○の内訳: 選手{yesPlayers}人・マネージャー{yesManagers}人
                </p>
              )}
              {hasGame ? (
                <div className="mt-2 space-y-2">
                  {d.games.map((g, i) => (
                    <GameBox key={g.id} game={g} index={i} total={d.games.length} />
                  ))}
                  {d.note && <p className="text-sm text-slate-600">{d.note}</p>}
                </div>
              ) : (
                <p className={`text-sm ${d.kind === "off" ? "text-slate-400" : "text-slate-700"}`}>{eventText(d)}</p>
              )}
              {!closed && answered.length > 0 && (
                <details className="mt-1 text-sm">
                  <summary className="cursor-pointer text-slate-500">回答した人を見る</summary>
                  <AnswerNames answered={answered} answers={d.answers} />
                </details>
              )}
              {d.events.map((e) => (
                <EventBox key={e.id} day={d.day} event={e} active={active} />
              ))}
              <EditorOnly>
                <div className="mt-2 border-t border-slate-100 pt-2">
                  <DayEditor day={d.day} kind={d.kind} note={d.note} extra={d.extra} hasGame={hasGame} />
                </div>
              </EditorOnly>
            </li>
          );
        })}
      </ul>

      <EditorOnly>
        <AddDateForm first={first} last={last} />
      </EditorOnly>

      {/* 回答 */}
      {targets.length > 0 && (
        <AnswerForm
          members={members.map((mem) => ({ id: mem.id, name: mem.name, number: mem.number }))}
          days={targets.map((t) => ({ day: t.key, label: t.label, event: t.event }))}
          current={current}
        />
      )}

      {/* 一覧表(未回答の人も分かる) */}
      <div className="space-y-1">
        <h2 className="text-sm font-bold text-slate-600">回答一覧</h2>
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100">
                <th className="sticky left-0 z-10 min-w-24 bg-slate-100 px-2 py-2 text-left font-medium">名前</th>
                {targets.map((t) => (
                  <th key={t.key} className="whitespace-nowrap px-2 py-2 font-medium tabular-nums">
                    {t.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((mem) => (
                <tr key={mem.id} className="border-b border-slate-100">
                  <th scope="row" className="sticky left-0 z-10 truncate bg-white px-2 py-1.5 text-left font-normal">
                    {mem.name}
                  </th>
                  {targets.map((t) => {
                    const a = t.answers[mem.id];
                    const out = !activeOn(mem, t.day);
                    return (
                      <td
                        key={t.key}
                        title={a?.comment ?? undefined}
                        className={`px-2 py-1.5 text-center font-bold ${
                          out ? "bg-slate-50" : a?.answer === "yes" ? "text-red-600" : a?.answer === "maybe" ? "text-amber-600" : "text-slate-400"
                        }`}
                      >
                        {out ? "" : a ? ANSWER_MARK[a.answer] : "−"}
                        {a?.comment && <sup className="text-[9px] font-normal text-slate-400">※</sup>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500">− は未回答。※はコメントあり(日付の「回答した人を見る」で確認できます)。</p>
      </div>
    </div>
  );
}
