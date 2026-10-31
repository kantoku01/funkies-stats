import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AddButton } from "@/components/editor-only";
import { GameList } from "@/components/game-list";
import { categoryScore, RANKING_CATEGORIES, type RankingCategory } from "@/components/home/ranking-categories";
import { GameScheduleInfo, scheduleOf } from "@/components/game-schedule-info";
import { GameTypeLabel } from "@/components/game-type-label";
import { getGamesBySeason, getNextGame } from "@/lib/data/games";
import { formatGameDate } from "@/lib/format";
import { todayInJapan } from "@/lib/season";
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
  const [stats, allGames, nextGame] = await Promise.all([
    getSeasonStats(season),
    getGamesBySeason(season),
    getNextGame(todayInJapan(new Date())),
  ]);
  // 直近の試合・連勝は終了した試合だけで数える
  const games = allGames.flatMap((g) => (g.status === "completed" && g.result ? [{ ...g, result: g.result }] : []));
  const t = stats.team;
  const streak = currentStreak(games.map((g) => g.result));

  return (
    <div className="space-y-6">
      <Link
        href="/schedule"
        className="flex min-h-12 items-center justify-between rounded-lg bg-brand-600 px-4 font-bold text-white"
      >
        <span>今月の予定・出欠を回答する</span>
        <span aria-hidden>›</span>
      </Link>

      {/* 次の試合 */}
      {nextGame && (
        <section className="space-y-2">
          <h2 className="font-bold">次の試合</h2>
          <Link
            href={`/games/${nextGame.id}`}
            className="block space-y-2 rounded-lg border-2 border-accent-500 bg-white p-4 hover:bg-slate-50"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xl font-bold tabular-nums">{formatGameDate(nextGame.game_date)}</span>
              <GameTypeLabel game={nextGame} />
            </div>
            <p className="text-lg font-bold">{nextGame.opponent ? `vs ${nextGame.opponent}` : "対戦相手未定"}</p>
            <GameScheduleInfo info={scheduleOf(nextGame)} />
          </Link>
        </section>
      )}

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
          <div className="flex items-center gap-3">
            <Link href={`/games?season=${season}`} className="text-sm text-brand-700">
              すべて見る ›
            </Link>
            <AddButton href="/admin/games/new" label="試合を追加" />
          </div>
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
          {/* 同率は同じ順位の数字で1人ずつ縦に並べる */}
          {groups.flatMap((g) =>
            g.items.map((p) => (
              <li key={p.playerId} className="flex items-center gap-2 px-3 py-2">
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${MEDAL[g.rank] ?? "bg-slate-100"}`}
                >
                  {g.rank}
                </span>
                <Link href={`/players/${p.playerId}?season=${stats.season}`} className="min-w-0 flex-1 truncate text-sm font-medium">
                  {p.fullName}
                </Link>
                <span className="shrink-0 font-bold tabular-nums">{value(p)}</span>
              </li>
            )),
          )}
        </ol>
      )}
    </div>
  );
}
