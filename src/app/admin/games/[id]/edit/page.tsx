import type { Metadata } from "next";
import { updateGame } from "../../actions";
import { GameForm } from "../../game-form";
import { loadGame } from "../../load-game";

export const metadata: Metadata = { title: "試合の編集" };

export default async function EditGamePage({ params }: PageProps<"/admin/games/[id]/edit">) {
  const { id } = await params;
  const g = await loadGame(id);

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-bold">試合の編集</h1>
      <GameForm
        action={updateGame}
        gameId={g.id}
        initial={{
          gameDate: g.game_date,
          opponent: g.opponent ?? "",
          teamScore: g.team_score?.toString() ?? "",
          opponentScore: g.opponent_score?.toString() ?? "",
          result: g.result,
          memo: g.memo ?? "",
        }}
        cancelHref={`/admin/games/${g.id}`}
        submitLabel="保存する"
      />
    </section>
  );
}
