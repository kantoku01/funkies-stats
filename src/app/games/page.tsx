import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AddButton } from "@/components/editor-only";
import { GameFilterTabs } from "@/components/game-filter-tabs";
import { GameList } from "@/components/game-list";
import { SeasonTabs } from "@/components/season-tabs";
import { getGamesBySeason } from "@/lib/data/games";
import { getSeasons, getSeasonTournaments } from "@/lib/data/stats";
import { matchesFilter, parseGameFilter } from "@/lib/games/type-label";

export const metadata: Metadata = { title: "試合一覧" };

export default function GamesPage({ searchParams }: PageProps<"/games">) {
  return (
    <Suspense fallback={<p className="text-slate-500">読み込み中…</p>}>
      <GamesView searchParams={searchParams} />
    </Suspense>
  );
}

async function GamesView({ searchParams }: { searchParams: PageProps<"/games">["searchParams"] }) {
  const params = await searchParams;
  const seasons = await getSeasons();
  const n = Number(Array.isArray(params.season) ? params.season[0] : params.season);
  const season = seasons.includes(n) ? n : (seasons[0] ?? null);
  const filter = parseGameFilter(params.type);
  const [allGames, tournaments] = season === null ? [[], []] : await Promise.all([getGamesBySeason(season), getSeasonTournaments(season)]);
  const games = allGames.filter((g) => matchesFilter(g, filter));
  const typeQuery = (key: string) => (key === "all" ? "" : `&type=${key}`);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{season ? `${season}年 ` : ""}試合一覧</h1>
        <AddButton href="/admin/games/new" label="試合を追加" />
      </div>
      {season !== null && <SeasonTabs seasons={seasons} current={season} href={(s) => `/games?season=${s}`} />}

      {season !== null && (
        <GameFilterTabs current={filter.key} tournaments={tournaments} href={(k) => `/games?season=${season}${typeQuery(k)}`} />
      )}
      <GameList games={games} />

      {/* 大会ごとの勝敗 */}
      {tournaments.length > 0 && (
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-slate-600">大会ごとの成績</h2>
          <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
            {tournaments.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/stats?season=${season}&type=t-${t.id}`}
                  className="flex min-h-12 items-center justify-between gap-3 px-3 hover:bg-slate-50"
                >
                  <span className="min-w-0 flex-1 truncate font-medium">{t.name}</span>
                  <span className="shrink-0 text-sm tabular-nums">
                    {t.games}試合 {t.wins}勝{t.losses}敗{t.draws > 0 ? `${t.draws}分` : ""}
                  </span>
                  <span className="text-xs text-brand-700">成績 ›</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

