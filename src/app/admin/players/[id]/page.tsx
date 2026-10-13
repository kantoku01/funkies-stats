import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getPlayerForAdmin, getPlayersForAdmin } from "@/lib/data/players";
import { currentYearInJapan } from "@/lib/season";
import { updatePlayer } from "../actions";
import { DeletePlayerButton } from "../delete-player-button";
import { PlayerForm } from "../player-form";
import { getEditableSeasons, pickSeason } from "../season";

export const metadata: Metadata = { title: "選手の編集" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditPlayerPage({ params, searchParams }: PageProps<"/admin/players/[id]">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!UUID.test(id)) notFound();

  await connection(); // 今日の日付を使うので、リクエストごとに描画する
  const now = new Date();
  const season = pickSeason(query.season, await getEditableSeasons(now), currentYearInJapan(now));
  const [player, { numbers }] = await Promise.all([getPlayerForAdmin(id), getPlayersForAdmin()]);
  if (!player) notFound();

  // そのシーズンの行があればその番号、なければ前シーズンからの引き継ぎ
  const own = numbers.filter((n) => n.player_id === id && n.season <= season).sort((a, b) => b.season - a.season)[0];
  const inheritedNote =
    own && own.season < season
      ? `${own.season}年の番号を引き継いでいます。変えるときだけ入力し直してください。`
      : null;

  return (
    <section className="space-y-6">
      <h1 className="text-xl font-bold">{player.full_name} さん</h1>
      <PlayerForm
        action={updatePlayer}
        playerId={player.id}
        season={season}
        initial={{
          fullName: player.full_name,
          kind: player.kind,
          joinedOn: player.joined_on ?? "",
          leftOn: player.left_on ?? "",
          number: own?.number ?? "",
        }}
        inheritedNote={inheritedNote}
        submitLabel="保存する"
      />
      <hr className="border-slate-200" />
      <DeletePlayerButton playerId={player.id} name={player.full_name} season={season} />
    </section>
  );
}
