import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { GameList } from "@/components/game-list";
import { categoryScore, RANKING_CATEGORIES, type RankingCategory } from "@/components/home/ranking-categories";
import { getGamesBySeason } from "@/lib/data/games";
import { getSeasons, getSeasonStats, type SeasonStatsWithNumbers } from "@/lib/data/stats";
import { currentStreak, formatQualifyingPa, formatRate, topRanks, type PlayerSeasonStats } from "@/lib/stats";

export default function HomePage() {
  return (
    <Suspense fallback={<p className="text-slate-500">読み込み中…</p>}>
      <HomeView />
    </Suspense>
  );
}

function formatAsOf(date: string | null): string | null {
  if (!date) return null;
  const [, m, d] = date.split("-").map(Number);
  return `${m}/${d}時点`;
}

async function HomeView() {
  // ビルド時の事前レンダリングでは DB に問い合わせず、リクエストのときに読む
  await connection();
  const seasons = await getSeasons();
  const season = seasons[0] ?? null;
  if (season === null) {
    return <p className="text-slate-600">まだ試合が登録されていません。</p>;
  }
  const [stats, games] = await Promise.all([getSeasonStats(season), getGamesBySeason(season)]);
  const t = stats.team;
  const streak = currentStreak(games.map((g) => g.result));
  const scored = games.filter((g) => g.team_score !== null && g.opponent_score !== null);
  const runsFor = scored.reduce((s, g) => s + (g.team_score ?? 0), 0);
  const runsAgainst = scored.reduce((s, g) => s + (g.opponent_score ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* 今年のチーム成績 */}
      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h1 className="text-xl font-bold">{season}年シーズン</h1>
          <span className="text-sm text-slate-500">{formatAsOf(stats.asOf)}</span>
        </div>
        <div className="rounded-lg bg-brand-600 p-4 text-white">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-brand-100">{t.games}試合</p>
              <p className="text-3xl font-bold tabular-nums">
                {t.wins}勝{t.losses}敗{t.draws > 0 && <span>{t.draws}分</span>}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-brand-100">勝率</p>
              <p className="text-3xl font-bold tabular-nums">{formatRate(t.winPct)}</p>
            </div>
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-white/20 pt-3 text-center">
            <TeamStat label="チーム打率" value={formatRate(stats.teamBatting.avg)} />
            <TeamStat label="チームOPS" value={formatRate(stats.teamBatting.ops)} />
            <TeamStat label="本塁打" value={String(stats.teamBatting.homeRuns)} />
          </dl>
          {scored.length > 0 && (
            <p className="mt-2 text-center text-xs text-brand-100">
              得点 {runsFor}・失点 {runsAgainst}(スコアを入力した{scored.length}試合)
            </p>
          )}
        </div>
      </section>

      {/* 直近5試合 */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">
            直近の試合
            {streak && (
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-xs text-white ${streak.kind === "win" ? "bg-red-600" : "bg-blue-700"}`}
              >
                {streak.count}連{streak.kind === "win" ? "勝" : "敗"}中
              </span>
            )}
          </h2>
          <Link href={`/games?season=${season}`} className="text-sm text-brand-700">
            すべて見る ›
          </Link>
        </div>
        <GameList games={games.slice(0, 5)} />
      </section>

      {/* 主要成績ランキング */}
      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="font-bold">成績ランキング</h2>
          <span className="text-xs text-slate-500">率は規定打席({formatQualifyingPa(t.games)})以上</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {RANKING_CATEGORIES.map((c) => (
            <RankingCard key={c.key} category={c} stats={stats} />
          ))}
        </div>
        <Link
          href={`/stats?season=${season}`}
          className="flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white text-sm"
        >
          全員の成績を見る
        </Link>
      </section>
    </div>
  );
}

function TeamStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-brand-100">{label}</dt>
      <dd className="text-lg font-bold tabular-nums">{value}</dd>
    </div>
  );
}

const MEDAL = ["", "bg-accent-500 text-white", "bg-brand-600 text-white", "bg-brand-200 text-brand-900"];

function RankingCard({ category, stats }: { category: RankingCategory; stats: SeasonStatsWithNumbers }) {
  const pool = category.pool === "qualified" ? stats.qualified : [...stats.qualified, ...stats.unqualified];
  const groups = topRanks(pool, (p) => categoryScore(category, p), {
    excludeZero: true,
    tieBreak: (a, b) => a.fullName.localeCompare(b.fullName, "ja"),
  });
  const value = (p: PlayerSeasonStats) =>
    category.kind === "rate" ? formatRate(p[category.key]) : `${p[category.key]}${category.unit}`;

  return (
    <div className="rounded-md border border-slate-200 bg-white">
      <h3 className="border-b border-slate-100 px-3 py-2 text-sm font-bold text-slate-600">{category.label}</h3>
      {groups.length === 0 ? (
        <p className="px-3 py-3 text-sm text-slate-400">該当者なし</p>
      ) : (
        <ol className="divide-y divide-slate-50">
          {groups.map((g) => {
            // 同じ順位が多いときは2人まで出して、残りは「ほか○人」にまとめる
            const shown = g.items.length > 3 ? g.items.slice(0, 2) : g.items;
            const rest = g.items.slice(shown.length);
            return (
              <li key={g.rank} className="flex items-start gap-2 px-3 py-2">
                <span
                  className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${MEDAL[g.rank] ?? "bg-slate-100"}`}
                >
                  {g.rank}
                </span>
                <div className="min-w-0 flex-1 text-sm">
                  {shown.map((p, i) => (
                    <span key={p.playerId}>
                      {i > 0 && "、"}
                      <Link href={`/players/${p.playerId}?season=${stats.season}`} className="font-medium">
                        {p.fullName}
                      </Link>
                    </span>
                  ))}
                  {rest.length > 0 && (
                    <details className="inline">
                      <summary className="inline cursor-pointer text-slate-500"> ほか{rest.length}人</summary>
                      <span className="block text-slate-600">
                        {rest.map((p) => p.fullName).join("、")}
                      </span>
                    </details>
                  )}
                  {g.items.length > 1 && <span className="ml-1 text-xs text-slate-400">(同率)</span>}
                </div>
                <span className="shrink-0 font-bold tabular-nums">{value(g.items[0])}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
