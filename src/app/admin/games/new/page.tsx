import type { Metadata } from "next";
import { connection } from "next/server";
import { getTournamentsForAdmin } from "@/lib/data/games";
import { todayInJapan } from "@/lib/season";
import { createGame } from "../actions";
import { GameForm } from "../game-form";

export const metadata: Metadata = { title: "試合を追加" };

export default async function NewGamePage({ searchParams }: PageProps<"/admin/games/new">) {
  const query = await searchParams;
  const dateParam = typeof query.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(query.date) ? query.date : null;
  // 今日の日付を既定値にするので、リクエストごとに描画する
  await connection();
  const tournaments = await getTournamentsForAdmin();
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-bold">試合を追加</h1>
      <GameForm
        action={createGame}
        tournaments={tournaments}
        initial={{
          status: "scheduled",
          startTime: "",
          meetTime: "",
          venue: "",
          uniform: "",
          bringBases: "",
          gameDate: dateParam ?? todayInJapan(new Date()),
          opponent: "",
          teamScore: "",
          opponentScore: "",
          result: "",
          memo: "",
          gameType: "open",
          tournamentId: "",
          newTournament: "",
          stage: "",
          roundLabel: "",
        }}
        cancelHref="/games"
        submitLabel="保存する"
      />
    </section>
  );
}
