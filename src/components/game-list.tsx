import Link from "next/link";
import { formatGameDate } from "@/lib/format";
import { formatTime } from "@/lib/games/form";
import type { GameTypeInfo } from "@/lib/games/type-label";
import type { GameResult, GameStatus } from "@/types/database";
import { formatScore, GameResultBadge } from "./game-result-badge";
import { GameTypeLabel } from "./game-type-label";

export type GameListItem = GameTypeInfo & {
  id: string;
  game_date: string;
  opponent: string | null;
  team_score: number | null;
  opponent_score: number | null;
  result: GameResult | null;
  status: GameStatus;
  start_time: string | null;
};

// 試合の一覧(勝敗・日付・相手・スコア)。タップで試合詳細へ
export function GameList({ games, empty = "アプリで登録した試合はまだありません。" }: { games: GameListItem[]; empty?: string }) {
  if (games.length === 0) {
    return <p className="text-sm text-slate-600">{empty}</p>;
  }
  return (
    <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
      {games.map((g) => (
        <li key={g.id}>
          <Link href={`/games/${g.id}`} className="flex min-h-12 items-center gap-3 px-3 hover:bg-slate-50">
            <GameResultBadge result={g.result} status={g.status} />
            <span className="w-20 shrink-0 tabular-nums">{formatGameDate(g.game_date)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate">{g.opponent ?? "(対戦相手未入力)"}</span>
              <GameTypeLabel game={g} />
            </span>
            {g.status === "scheduled" ? (
              <span className="shrink-0 text-sm tabular-nums text-brand-700">{formatTime(g.start_time) || "予定"}</span>
            ) : g.status === "cancelled" ? (
              <span className="shrink-0 text-sm font-bold text-slate-500">雨天中止</span>
            ) : (
              <span className="shrink-0 font-bold tabular-nums">{formatScore(g.team_score, g.opponent_score)}</span>
            )}
            <span aria-hidden className="text-slate-400">
              ›
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
