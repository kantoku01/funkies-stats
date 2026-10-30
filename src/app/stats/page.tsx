import type { Metadata } from "next";
import { Suspense } from "react";
import { toRow, toTeamRow } from "@/components/leaderboard/build-rows";
import type { LeaderboardGroup } from "@/components/leaderboard/columns";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { SeasonTabs } from "@/components/season-tabs";
import { getSeasons, getSeasonStats } from "@/lib/data/stats";
import { formatQualifyingPa } from "@/lib/stats";

export const metadata: Metadata = { title: "成績一覧" };

export default function StatsPage({ searchParams }: PageProps<"/stats">) {
  return (
    <Suspense fallback={<p className="text-slate-500">成績を読み込み中…</p>}>
      <SeasonStatsView searchParams={searchParams} />
    </Suspense>
  );
}

function parseSeason(value: string | string[] | undefined, seasons: number[]): number | null {
  const n = Number(Array.isArray(value) ? value[0] : value);
  if (seasons.includes(n)) return n;
  // 既定: 試合が1つでも登録された最新のシーズン
  return seasons[0] ?? null;
}

function formatAsOf(date: string | null): string | null {
  if (!date) return null;
  const [, m, d] = date.split("-").map(Number);
  return `${m}/${d}時点`;
}

async function SeasonStatsView({ searchParams }: { searchParams: PageProps<"/stats">["searchParams"] }) {
  // 先にリクエストの値を読む(ビルド時の事前レンダリングで DB に問い合わせないように)
  const params = await searchParams;
  const seasons = await getSeasons();
  const season = parseSeason(params.season, seasons);

  if (season === null) {
    return (
      <section className="space-y-2">
        <h1 className="text-xl font-bold">成績一覧</h1>
        <p className="text-slate-600">まだ試合が登録されていません。</p>
      </section>
    );
  }

  const stats = await getSeasonStats(season);
  const groups: LeaderboardGroup[] = [
    { key: "qualified", label: null, rows: stats.qualified.map((p) => toRow(p, stats.numbers[p.playerId])) },
    { key: "unqualified", label: "規定未達", rows: stats.unqualified.map((p) => toRow(p, stats.numbers[p.playerId])) },
    { key: "guests", label: "助っ人", rows: stats.guests.map((p) => toRow(p, stats.numbers[p.playerId])) },
  ];
  const t = stats.teamBatting;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{season}年 成績一覧</h1>
        <SeasonTabs seasons={seasons} current={season} href={(s) => `/stats?season=${s}`} />
      </div>


      <p className="flex gap-4 text-sm text-slate-600">
        {formatAsOf(stats.asOf) && <span>{formatAsOf(stats.asOf)}</span>}
        <span>規定打席 {formatQualifyingPa(stats.team.games)}</span>
      </p>

      <LeaderboardTable groups={groups} team={toTeamRow(t, stats.team.games)} season={season} />

      <p className="text-xs text-slate-500">列の見出しをタップすると並べ替えできます。氏名をタップすると個人成績を表示します。</p>
    </section>
  );
}
