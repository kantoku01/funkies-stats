import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GameList } from "@/components/game-list";
import { SeasonTabs } from "@/components/season-tabs";
import { getCurrentEditor } from "@/lib/auth";
import { getGamesBySeason } from "@/lib/data/games";
import { getSeasons } from "@/lib/data/stats";

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
  const games = season === null ? [] : await getGamesBySeason(season);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{season ? `${season}年 ` : ""}試合一覧</h1>
        {/* 編集者にだけ「試合を追加」を出す */}
        <Suspense fallback={null}>
          <AddGameButton />
        </Suspense>
      </div>
      {season !== null && <SeasonTabs seasons={seasons} current={season} href={(s) => `/games?season=${s}`} />}

      <GameList games={games} />
    </section>
  );
}

async function AddGameButton() {
  if (!(await getCurrentEditor())) return null;
  return (
    <Link href="/admin/games/new" className="flex min-h-11 items-center rounded-md bg-brand-600 px-4 font-bold text-white">
      試合を追加
    </Link>
  );
}
