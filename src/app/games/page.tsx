import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { formatScore, GameResultBadge } from "@/components/game-result-badge";
import { SeasonTabs } from "@/components/season-tabs";
import { getCurrentEditor } from "@/lib/auth";
import { getGamesBySeason } from "@/lib/data/games";
import { getSeasons } from "@/lib/data/stats";
import { formatGameDate } from "@/lib/format";

export const metadata: Metadata = { title: "試合一覧" };

type Games = Awaited<ReturnType<typeof getGamesBySeason>>;

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

      {/* 編集者なら各試合から編集画面へ進める */}
      <Suspense fallback={<GameList games={games} editable={false} />}>
        <EditableGameList games={games} />
      </Suspense>
    </section>
  );
}

async function AddGameButton() {
  if (!(await getCurrentEditor())) return null;
  return (
    <Link href="/admin/games/new" className="flex min-h-11 items-center rounded-md bg-blue-900 px-4 font-bold text-white">
      試合を追加
    </Link>
  );
}

async function EditableGameList({ games }: { games: Games }) {
  return <GameList games={games} editable={Boolean(await getCurrentEditor())} />;
}

function GameList({ games, editable }: { games: Games; editable: boolean }) {
  if (games.length === 0) {
    return <p className="text-slate-600">アプリで登録した試合はまだありません。</p>;
  }
  return (
    <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
      {games.map((g) => {
        const body = (
          <>
            <GameResultBadge result={g.result} />
            <span className="w-20 shrink-0 tabular-nums">{formatGameDate(g.game_date)}</span>
            <span className="flex-1 truncate">{g.opponent ?? "(対戦相手未入力)"}</span>
            <span className="shrink-0 font-bold tabular-nums">{formatScore(g.team_score, g.opponent_score)}</span>
          </>
        );
        return (
          <li key={g.id}>
            {editable ? (
              <Link href={`/admin/games/${g.id}`} className="flex min-h-12 items-center gap-3 px-3 hover:bg-slate-50">
                {body}
                <span aria-hidden className="text-slate-400">
                  ›
                </span>
              </Link>
            ) : (
              <div className="flex min-h-12 items-center gap-3 px-3">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
