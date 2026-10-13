import type { Metadata } from "next";
import Link from "next/link";
import type { BattingEntry } from "@/lib/batting/entry";
import { battingOrderSort } from "@/lib/batting/entry";
import { getParticipantsForAdmin, getPlateAppearancesForAdmin } from "@/lib/data/games";
import { getPlayersForAdmin } from "@/lib/data/players";
import { formatGameDate } from "@/lib/format";
import { resolveNumber } from "@/lib/stats";
import { loadGame } from "../../load-game";
import { BattingInput, type BattingPlayer } from "./batting-input";

export const metadata: Metadata = { title: "打撃入力" };

export default async function BattingPage({ params, searchParams }: PageProps<"/admin/games/[id]/batting">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [game, participants, plateAppearances, { players, numbers }] = await Promise.all([
    loadGame(id),
    getParticipantsForAdmin(id),
    getPlateAppearancesForAdmin(id),
    getPlayersForAdmin(),
  ]);

  if (participants.length === 0) {
    return (
      <section className="space-y-3">
        <h1 className="text-xl font-bold">打撃入力</h1>
        <p className="text-slate-600">先に参加者を登録してください。</p>
        <Link
          href={`/admin/games/${id}/participants`}
          className="inline-flex min-h-11 items-center rounded-md bg-blue-900 px-4 font-bold text-white"
        >
          参加者登録へ
        </Link>
      </section>
    );
  }

  const byId = new Map(players.map((p) => [p.id, p]));
  const list: BattingPlayer[] = battingOrderSort(
    participants.map((p) => {
      const player = byId.get(p.player_id);
      return {
        playerId: p.player_id,
        name: player?.full_name ?? "(不明な選手)",
        number: player?.kind === "guest" ? "助" : (resolveNumber(numbers, p.player_id, game.season) ?? ""),
        battingOrder: p.batting_order,
      };
    }),
  );

  const initial: Record<string, { entries: BattingEntry[]; extra: number }> = Object.fromEntries(
    participants.map((p) => [p.player_id, { entries: [], extra: p.extra_stolen_bases }]),
  );
  for (const pa of plateAppearances) {
    initial[pa.player_id]?.entries.push({ result: pa.result, rbi: pa.rbi, stolenBases: pa.stolen_bases });
  }

  // 指定がなければ、まだ打席が入っていない最初の選手から始める
  const requested = Array.isArray(query.player) ? query.player[0] : query.player;
  const firstEmpty = list.find((p) => initial[p.playerId].entries.length === 0)?.playerId ?? null;

  return (
    <section className="space-y-2">
      <p className="text-sm text-slate-500">
        <Link href={`/admin/games/${id}`} className="text-blue-800">
          ‹ 試合
        </Link>
        <span className="ml-2">
          {formatGameDate(game.game_date)} {game.opponent ?? ""} の打撃入力
        </span>
      </p>
      <BattingInput
        gameId={id}
        players={list}
        initial={initial}
        startPlayerId={requested ?? firstEmpty}
        finishHref={`/games/${id}`}
      />
    </section>
  );
}
