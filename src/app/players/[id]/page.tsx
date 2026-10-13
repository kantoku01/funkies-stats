import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GameResultBadge } from "@/components/game-result-badge";
import { PaChip } from "@/components/pa-chips";
import { SeasonTabs } from "@/components/season-tabs";
import { battingSummary } from "@/lib/batting/entry";
import { getPlayerPage } from "@/lib/data/detail";
import { getSeasonStats } from "@/lib/data/stats";
import { formatGameDate } from "@/lib/format";
import { formatRate, type PlayerSeasonStats } from "@/lib/stats";

export const metadata: Metadata = { title: "個人成績" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function PlayerPageRoute({ params, searchParams }: PageProps<"/players/[id]">) {
  return (
    <Suspense fallback={<p className="text-slate-500">読み込み中…</p>}>
      <PlayerView params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function PlayerView({
  params,
  searchParams,
}: {
  params: PageProps<"/players/[id]">["params"];
  searchParams: PageProps<"/players/[id]">["searchParams"];
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!UUID.test(id)) notFound();
  const requested = Number(Array.isArray(query.season) ? query.season[0] : query.season);
  const page = await getPlayerPage(id, Number.isInteger(requested) ? requested : null);
  if (!page) notFound();

  const season = page.seasons.includes(requested) ? requested : (page.seasons[0] ?? null);
  const stats = season === null ? null : await getSeasonStats(season);
  const line = stats && [...stats.qualified, ...stats.unqualified, ...stats.guests].find((p) => p.playerId === id);
  // 初期値(移行データ)の分 = シーズン累計 − アプリで入力した試合の分
  const appGames = page.games.length;
  const baselineAttendance = line ? line.attendance - appGames : 0;

  return (
    <section className="space-y-4">
      <Link href={season ? `/?season=${season}` : "/"} className="text-sm text-blue-800">
        ‹ 成績一覧
      </Link>
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-bold tabular-nums text-slate-400">{page.number}</span>
        <h1 className="text-2xl font-bold">{page.player.fullName}</h1>
        {page.player.kind === "guest" && <span className="text-sm text-slate-500">助っ人</span>}
      </div>
      {season !== null && (
        <SeasonTabs seasons={page.seasons} current={season} href={(s) => `/players/${id}?season=${s}`} />
      )}

      {!line ? (
        <p className="text-slate-600">記録はまだありません。</p>
      ) : (
        <>
          <SeasonSummary season={season!} line={line} qualifiedLabel={qualifiedLabel(line)} />

          <div className="space-y-1">
            <h2 className="text-sm font-bold text-slate-600">試合ごとの成績</h2>
            <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
              {page.games.map((g) => {
                const rbi = g.entries.reduce((s, e) => s + e.rbi, 0);
                const sb = g.extraStolenBases + g.entries.reduce((s, e) => s + e.stolenBases, 0);
                return (
                  <li key={g.gameId}>
                    <Link href={`/games/${g.gameId}`} className="block space-y-1 px-3 py-2 hover:bg-slate-50">
                      <div className="flex items-center gap-2 text-sm">
                        <GameResultBadge result={g.result} />
                        <span className="tabular-nums">{formatGameDate(g.gameDate)}</span>
                        <span className="flex-1 truncate text-slate-600">{g.opponent ?? ""}</span>
                        <span className="text-xs text-slate-500">
                          打点{rbi} 盗塁{sb}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1 pl-9">
                        {g.entries.length === 0 ? (
                          <span className="text-xs text-slate-400">打席なし</span>
                        ) : (
                          g.entries.map((e, i) => <PaChip key={i} entry={e} />)
                        )}
                        <span className="ml-1 text-xs text-slate-500">{battingSummary(g.entries, g.extraStolenBases)}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
              {baselineAttendance > 0 && (
                <li className="px-3 py-2 text-sm text-slate-500">
                  ほかに、9/13 時点までの移行データ({baselineAttendance}試合出席)を含みます。
                </li>
              )}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}

function qualifiedLabel(line: PlayerSeasonStats): string {
  if (line.kind === "guest") return "助っ人";
  return line.qualified ? "規定到達" : "規定未達";
}

function SeasonSummary({ season, line, qualifiedLabel }: { season: number; line: PlayerSeasonStats; qualifiedLabel: string }) {
  const big = [
    ["OPS", formatRate(line.ops)],
    ["打率", formatRate(line.avg)],
    ["出塁率", formatRate(line.obp)],
    ["長打率", formatRate(line.slg)],
  ] as const;
  const small = [
    ["試合", line.games],
    ["出席", line.attendance],
    ["出席率", formatRate(line.attendanceRate)],
    ["打撃貢献率", formatRate(line.contribution)],
    ["打席", line.pa],
    ["打数", line.atBats],
    ["安打", line.hits],
    ["塁打数", line.totalBases],
    ["単打", line.singles],
    ["二塁打", line.doubles],
    ["三塁打", line.triples],
    ["本塁打", line.homeRuns],
    ["打点", line.rbi],
    ["盗塁", line.stolenBases],
    ["四球", line.walks],
    ["死球", line.hbp],
    ["犠飛", line.sacFlies],
    ["犠打", line.sacBunts],
  ] as const;

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-bold text-slate-600">
        {season}年 シーズン累計 <span className="ml-1 font-normal text-slate-500">({qualifiedLabel})</span>
      </h2>
      <dl className="grid grid-cols-4 gap-2 text-center">
        {big.map(([label, value]) => (
          <div key={label} className="rounded-md border border-slate-200 bg-white px-1 py-2">
            <dt className="text-xs text-slate-500">{label}</dt>
            <dd className="text-lg font-bold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <dl className="grid grid-cols-4 gap-x-2 gap-y-1 rounded-md border border-slate-200 bg-white p-3 text-center">
        {small.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[11px] text-slate-500">{label}</dt>
            <dd className="font-bold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
