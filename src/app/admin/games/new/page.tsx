import type { Metadata } from "next";
import { connection } from "next/server";
import { todayInJapan } from "@/lib/season";
import { createGame } from "../actions";
import { GameForm } from "../game-form";

export const metadata: Metadata = { title: "試合を追加" };

export default async function NewGamePage() {
  // 今日の日付を既定値にするので、リクエストごとに描画する
  await connection();
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-bold">試合を追加</h1>
      <GameForm
        action={createGame}
        initial={{ gameDate: todayInJapan(new Date()), opponent: "", teamScore: "", opponentScore: "", result: "", memo: "" }}
        cancelHref="/games"
        submitLabel="保存して参加者の登録へ"
      />
    </section>
  );
}
