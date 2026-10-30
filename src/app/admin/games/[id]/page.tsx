import type { Metadata } from "next";
import Link from "next/link";
import { formatScore, GameResultBadge } from "@/components/game-result-badge";
import { GameScheduleInfo, scheduleOf } from "@/components/game-schedule-info";
import { GameTypeLabel } from "@/components/game-type-label";
import { getParticipantsForAdmin } from "@/lib/data/games";
import { formatGameDate } from "@/lib/format";
import { loadGame } from "../load-game";
import { DeleteGameButton } from "./delete-game-button";

export const metadata: Metadata = { title: "試合" };

export default async function GamePage({ params }: PageProps<"/admin/games/[id]">) {
  const { id } = await params;
  const [g, participants] = await Promise.all([loadGame(id), getParticipantsForAdmin(id)]);
  const paCount = participants.reduce((sum, p) => sum + p.paCount, 0);
  const label = `${g.season}/${formatGameDate(g.game_date)}`;

  const steps = [
    { href: `/admin/games/${g.id}/edit`, title: "試合情報", detail: "日付・相手・スコア" },
    { href: `/admin/games/${g.id}/participants`, title: "参加者", detail: `${participants.length}人` },
    { href: `/admin/games/${g.id}/batting`, title: "打撃入力", detail: `${paCount}打席` },
  ];

  return (
    <section className="space-y-5">
      <div className="flex justify-between text-sm">
        <Link href={`/games?season=${g.season}`} className="text-brand-700">
          ‹ 試合一覧
        </Link>
        <Link href={`/games/${g.id}`} className="text-brand-700">
          試合詳細を見る ›
        </Link>
      </div>

      <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-white p-4">
        <GameResultBadge result={g.result} />
        <div className="flex-1">
          <p className="text-sm text-slate-500">{label}</p>
          <p className="font-bold">{g.opponent ?? "(対戦相手未入力)"}</p>
          <GameTypeLabel game={g} />
        </div>
        <p className="text-2xl font-bold tabular-nums">
          {g.status === "scheduled" ? <span className="text-base text-brand-700">予定</span> : formatScore(g.team_score, g.opponent_score)}
        </p>
      </div>
      <GameScheduleInfo info={scheduleOf(g)} className="rounded-md border border-slate-200 bg-white p-3" />
      {g.memo && <p className="whitespace-pre-wrap text-sm text-slate-600">{g.memo}</p>}
      {g.status === "scheduled" && (
        <Link
          href={`/admin/games/${g.id}/edit?result=1`}
          className="flex min-h-12 items-center justify-center rounded-md bg-accent-500 text-lg font-bold text-white"
        >
          試合が終わったら:結果を入力
        </Link>
      )}

      <ol className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
        {steps.map((s, i) => (
          <li key={s.title}>
            {s.href ? (
              <Link href={s.href} className="flex min-h-14 items-center gap-3 px-4 hover:bg-slate-50">
                <span className="flex size-6 items-center justify-center rounded-full bg-brand-600 text-xs text-white">{i + 1}</span>
                <span className="flex-1 whitespace-nowrap font-medium">{s.title}</span>
                <span className="truncate text-sm text-slate-500">{s.detail}</span>
                <span aria-hidden className="text-slate-400">
                  ›
                </span>
              </Link>
            ) : (
              <div className="flex min-h-14 items-center gap-3 px-4 text-slate-400">
                <span className="flex size-6 items-center justify-center rounded-full bg-slate-300 text-xs text-white">{i + 1}</span>
                <span className="flex-1 whitespace-nowrap font-medium">{s.title}</span>
                <span className="text-sm">{s.detail}</span>
              </div>
            )}
          </li>
        ))}
      </ol>

      <hr className="border-slate-200" />
      <DeleteGameButton gameId={g.id} label={label} participantCount={participants.length} paCount={paCount} />
    </section>
  );
}
