import type { Metadata } from "next";
import { updateGame } from "../../actions";
import { GameForm } from "../../game-form";
import { getTournamentsForAdmin, getVenuesForAdmin } from "@/lib/data/games";
import { createClient } from "@/lib/supabase/server";
import { loadGame } from "../../load-game";

export const metadata: Metadata = { title: "試合の編集" };

export default async function EditGamePage({ params, searchParams }: PageProps<"/admin/games/[id]/edit">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const [g, tournaments, venues, { data: members }, { data: costs }] = await Promise.all([
    loadGame(id),
    getTournamentsForAdmin(),
    getVenuesForAdmin(),
    supabase.from("players").select("id, full_name, left_on").in("kind", ["regular", "manager"]).order("full_name"),
    supabase
      .from("game_costs")
      .select("id, item, amount, opponent_share, payer, player_id, memo")
      .eq("game_id", id)
      .order("created_at"),
  ]);
  // 今ある当日のお金を、同じ画面で直せる形に
  const costRows = (costs ?? []).map((c) => ({
    id: c.id,
    item: c.item,
    amount: String(c.amount),
    opponentShare: c.opponent_share ? String(c.opponent_share) : "",
    payer: c.payer === "club" ? "club" : c.payer === "player" ? (c.player_id ?? "") : "",
    memo: c.memo ?? "",
  }));

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-bold">{query.result === "1" ? "結果を入力" : "試合の編集"}</h1>
      <GameForm
        action={updateGame}
        gameId={g.id}
        initialStatus={g.status}
        tournaments={tournaments}
        venues={venues}
        // 当日のお金を立て替える人の候補: 在籍中の選手とマネージャー(退団した人も、もう立て替えている人なら残す)
        costMembers={(members ?? [])
          .filter((m) => m.left_on === null || costs?.some((c) => c.player_id === m.id))
          .map((m) => ({ id: m.id, name: m.full_name }))}
        initial={{
          // 「結果を入力」から来たら、最初から「結果あり」にしておく
          status: query.result === "1" ? "completed" : g.status,
          startTime: g.start_time?.slice(0, 5) ?? "",
          meetTime: g.meet_time?.slice(0, 5) ?? "",
          venue: g.venue ?? "",
          venueMapUrl: g.venue_map_url ?? "",
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
          costs: JSON.stringify(costRows),
        }}
        cancelHref={`/admin/games/${g.id}`}
        submitLabel="保存する"
      />
    </section>
  );
}
