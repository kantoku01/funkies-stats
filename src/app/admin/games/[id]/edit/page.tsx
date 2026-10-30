import type { Metadata } from "next";
import { updateGame } from "../../actions";
import { GameForm } from "../../game-form";
import { getTournamentsForAdmin } from "@/lib/data/games";
import { loadGame } from "../../load-game";

export const metadata: Metadata = { title: "試合の編集" };

export default async function EditGamePage({ params, searchParams }: PageProps<"/admin/games/[id]/edit">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [g, tournaments] = await Promise.all([loadGame(id), getTournamentsForAdmin()]);

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-bold">{query.result === "1" ? "結果を入力" : "試合の編集"}</h1>
      <GameForm
        action={updateGame}
        gameId={g.id}
        initialStatus={g.status}
        tournaments={tournaments}
        initial={{
          // 「結果を入力」から来たら、最初から「結果あり」にしておく
          status: query.result === "1" ? "completed" : g.status,
          startTime: g.start_time?.slice(0, 5) ?? "",
          meetTime: g.meet_time?.slice(0, 5) ?? "",
          venue: g.venue ?? "",
          uniform: g.uniform ?? "",
          bringBases: g.bring_bases === null ? "" : g.bring_bases ? "need" : "none",
          gameDate: g.game_date,
          opponent: g.opponent ?? "",
          teamScore: g.team_score?.toString() ?? "",
          opponentScore: g.opponent_score?.toString() ?? "",
          result: g.result ?? "",
          memo: g.memo ?? "",
          gameType: g.game_type,
          tournamentId: g.tournament_id ?? "",
          newTournament: "",
          stage: g.stage ?? "",
          roundLabel: g.round_label ?? "",
        }}
        cancelHref={`/admin/games/${g.id}`}
        submitLabel="保存する"
      />
    </section>
  );
}
