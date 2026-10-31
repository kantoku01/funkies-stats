import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { formatScore, GameResultBadge } from "@/components/game-result-badge";
import { GameScheduleInfo } from "@/components/game-schedule-info";
import { GameTypeLabel } from "@/components/game-type-label";
import { PaChip } from "@/components/pa-chips";
import { getCurrentEditor } from "@/lib/auth";
import { battingSummary } from "@/lib/batting/entry";
import { getGameDetail } from "@/lib/data/detail";
import { getScheduleMonth } from "@/lib/data/schedule";
import { ANSWER_MARK, parseMonth } from "@/lib/schedule/month";
import { formatGameDate } from "@/lib/format";

export const metadata: Metadata = { title: "試合詳細" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function GameDetailPage({ params }: PageProps<"/games/[id]">) {
  return (
    <Suspense fallback={<p className="text-slate-500">読み込み中…</p>}>
      <GameDetailView params={params} />
    </Suspense>
  );
}

async function GameDetailView({ params }: { params: PageProps<"/games/[id]">["params"] }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const g = await getGameDetail(id);
  if (!g) notFound();

  const maxPa = Math.max(0, ...g.lines.map((l) => l.entries.length));
  const totals = g.lines.reduce(
    (t, l) => ({
      rbi: t.rbi + l.entries.reduce((s, e) => s + e.rbi, 0),
      sb: t.sb + l.extraStolenBases + l.entries.reduce((s, e) => s + e.stolenBases, 0),
    }),
    { rbi: 0, sb: 0 },
  );

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href={`/games?season=${g.season}`} className="text-sm text-brand-700">
          ‹ 試合一覧
        </Link>
        <Suspense fallback={null}>
          <EditLink gameId={g.id} />
        </Suspense>
      </div>

      <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-white p-4">
        <GameResultBadge result={g.result} status={g.status} />
        <div className="flex-1">
          <p className="text-sm text-slate-500">
            {g.season}/{formatGameDate(g.gameDate)}
          </p>
          <h1 className="font-bold">{g.opponent ?? "(対戦相手未入力)"}</h1>
          <GameTypeLabel game={g.typeInfo} />
        </div>
        <p className="text-2xl font-bold tabular-nums">
          {g.status === "scheduled" ? (
            <span className="text-base text-brand-700">予定</span>
          ) : g.status === "cancelled" ? (
            <span className="text-base text-slate-500">雨天中止</span>
          ) : (
            formatScore(g.teamScore, g.opponentScore)
          )}
        </p>
      </div>
      <GameScheduleInfo info={g.schedule} className="rounded-md border border-slate-200 bg-white p-3" />
      {g.memo && <p className="whitespace-pre-wrap text-sm text-slate-600">{g.memo}</p>}

      {g.status === "scheduled" ? (
        <Suspense fallback={null}>
          <GameAttendance day={g.gameDate} />
        </Suspense>
      ) : g.status === "cancelled" ? (
        <p className="text-slate-600">雨天中止のため、試合数・出席には数えません。</p>
      ) : g.lines.length === 0 ? (
        <p className="text-slate-600">参加者はまだ登録されていません。</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="whitespace-nowrap border-b border-slate-200 bg-slate-100 text-slate-600">
                <th scope="col" className="sticky left-0 z-10 min-w-36 bg-slate-100 px-2 py-2 text-left font-medium">
                  選手
                </th>
                {Array.from({ length: maxPa }, (_, i) => (
                  <th key={i} scope="col" className="px-1 py-2 font-medium">
                    {i + 1}
                  </th>
                ))}
                <th scope="col" className="px-2 py-2 font-medium">
                  打点
                </th>
                <th scope="col" className="px-2 py-2 font-medium">
                  盗塁
                </th>
              </tr>
            </thead>
            <tbody>
              {g.lines.map((l) => {
                const rbi = l.entries.reduce((s, e) => s + e.rbi, 0);
                const sb = l.extraStolenBases + l.entries.reduce((s, e) => s + e.stolenBases, 0);
                return (
                  <tr key={l.playerId} className="border-b border-slate-100">
                    <th scope="row" className="sticky left-0 z-10 bg-white px-2 py-1.5 text-left font-normal">
                      <Link href={`/players/${l.playerId}?season=${g.season}`} className="block">
                        <span className="mr-1 inline-block w-6 text-center text-xs tabular-nums text-slate-500">
                          {l.number}
                        </span>
                        <span className="font-medium">{l.name}</span>
                        <span className="block pl-7 text-xs text-slate-500">{battingSummary(l.entries, l.extraStolenBases)}</span>
                      </Link>
                    </th>
                    {Array.from({ length: maxPa }, (_, i) => (
                      <td key={i} className="px-1 py-1.5 text-center">
                        {l.entries[i] && <PaChip entry={l.entries[i]} />}
                      </td>
                    ))}
                    <td className="px-2 py-1.5 text-center tabular-nums">{rbi}</td>
                    <td className="px-2 py-1.5 text-center tabular-nums">{sb}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-semibold">
                <th scope="row" className="sticky left-0 bg-slate-100 px-2 py-2 text-left">
                  合計
                </th>
                <td colSpan={maxPa} />
                <td className="px-2 py-2 text-center tabular-nums">{totals.rbi}</td>
                <td className="px-2 py-2 text-center tabular-nums">{totals.sb}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      {g.status === "completed" && (
      <p className="text-xs text-slate-500">
        単・二・三・本 = 安打 / 四・死 = 四死球 / 犠飛・犠打 / 凡 = 凡退。右上の小さな数字は打点。
      </p>
      )}
    </section>
  );
}

async function EditLink({ gameId }: { gameId: string }) {
  if (!(await getCurrentEditor())) return null;
  return (
    <Link href={`/admin/games/${gameId}`} className="flex min-h-11 items-center rounded-md border border-slate-300 bg-white px-3 text-sm">
      編集
    </Link>
  );
}

// 予定の試合: その日の出欠(○△×と未回答)を参加者一覧として出す
async function GameAttendance({ day }: { day: string }) {
  const { days, members } = await getScheduleMonth(parseMonth(day.slice(0, 7))!);
  const d = days.find((x) => x.day === day);
  const active = members.filter((m) => m.joinedOn <= day && (m.leftOn === null || m.leftOn >= day));
  const answerOf = (id: string) => d?.answers[id];
  const groups = (["yes", "maybe", "no"] as const).map((a) => ({ a, who: active.filter((m) => answerOf(m.id)?.answer === a) }));
  const unanswered = active.filter((m) => !answerOf(m.id));
  const yes = groups[0].who;
  const yesPlayers = yes.filter((m) => m.kind === "regular").length;

  return (
    <div className="space-y-2 rounded-md border border-slate-200 bg-white p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-bold">参加者(出欠)</h2>
        <Link href={`/schedule/${day.slice(0, 7)}`} className="text-sm text-brand-700">
          出欠を回答する ›
        </Link>
      </div>
      <p className="text-sm">
        <span className="font-bold text-red-600">○ 参加 {yes.length}人</span>
        <span className="text-slate-500">
          (選手{yesPlayers}人・マネージャー{yes.length - yesPlayers}人)
        </span>
      </p>
      <ul className="space-y-1.5 text-sm">
        {groups.map(({ a, who }) => (
          <li key={a} className="flex gap-2">
            <span className={`w-5 shrink-0 font-bold ${a === "yes" ? "text-red-600" : a === "maybe" ? "text-amber-600" : "text-slate-500"}`}>
              {ANSWER_MARK[a]}
            </span>
            <span className={who.length === 0 ? "text-slate-400" : ""}>
              {who.length === 0
                ? "なし"
                : who.map((m) => {
                    const c = answerOf(m.id)?.comment;
                    return c ? `${m.name}(${c})` : m.name;
                  }).join("、")}
            </span>
          </li>
        ))}
        <li className="flex gap-2 text-slate-500">
          <span className="w-5 shrink-0 text-xs leading-5">未</span>
          <span>{unanswered.length === 0 ? "なし" : unanswered.map((m) => m.name).join("、")}</span>
        </li>
      </ul>
    </div>
  );
}
