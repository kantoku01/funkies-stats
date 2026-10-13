import type { Metadata } from "next";
import { currentYearInJapan, todayInJapan } from "@/lib/season";
import { createPlayer } from "../actions";
import { PlayerForm } from "../player-form";
import { getEditableSeasons, pickSeason } from "../season";

export const metadata: Metadata = { title: "選手を追加" };

export default async function NewPlayerPage({ searchParams }: PageProps<"/admin/players/new">) {
  const params = await searchParams;
  const now = new Date();
  const season = pickSeason(params.season, await getEditableSeasons(now), currentYearInJapan(now));

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-bold">選手を追加</h1>
      <PlayerForm
        action={createPlayer}
        season={season}
        initial={{ fullName: "", kind: "regular", joinedOn: todayInJapan(now), leftOn: "", number: "" }}
        inheritedNote={null}
        submitLabel="登録する"
      />
    </section>
  );
}
