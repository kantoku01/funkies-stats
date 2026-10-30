import type { Metadata } from "next";
import { Suspense } from "react";
import { toRow, toTeamRow } from "@/components/leaderboard/build-rows";
import type { LeaderboardGroup } from "@/components/leaderboard/columns";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { SeasonTabs } from "@/components/season-tabs";
import { getSeasons, getSeasonStats } from "@/lib/data/stats";
import { formatQualifyingPa, formatRate } from "@/lib/stats";

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

      <dl className="grid grid-cols-3 gap-2 text-center">
        <Stat label="試合" value={String(stats.team.games)} />
        <Stat
          label="勝敗"
          value={`${stats.team.wins}勝${stats.team.losses}敗${stats.team.draws > 0 ? `${stats.team.draws}分` : ""}`}
        />
        <Stat label="勝率" value={formatRate(stats.team.winPct)} />
        <Stat label="チーム打率" value={formatRate(t.avg)} />
        <Stat label="チーム出塁率" value={formatRate(t.obp)} />
        <Stat label="チームOPS" value={formatRate(t.ops)} />
      </dl>

      <p className="flex gap-4 text-sm text-slate-600">
        {formatAsOf(stats.asOf) && <span>{formatAsOf(stats.asOf)}</span>}
        <span>規定打席 {formatQualifyingPa(stats.team.games)}</span>
      </p>

      <LeaderboardTable groups={groups} team={toTeamRow(t, stats.team.games)} season={season} />

      <p className="text-xs text-slate-500">列の見出しをタップすると並べ替えできます。氏名をタップすると個人成績を表示します。</p>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-2 py-2">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-lg font-bold tabular-nums">{value}</dd>
    </div>
  );
}
