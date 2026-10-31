"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentEditor } from "@/lib/auth";
import { getParticipantsForAdmin } from "@/lib/data/games";
import { STATS_TAG } from "@/lib/data/stats";
import { parseGameForm, tournamentNameWithYear, type GameFormErrors, type GameFormValues, type TournamentChoice } from "@/lib/games/form";
import { planParticipants } from "@/lib/games/participants";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireEditor(next: string) {
  // Server Action は直接呼べるのでここでも確認する(DB の RLS でも拒否される)
  if (!(await getCurrentEditor())) redirect(`/login?next=${encodeURIComponent(next)}`);
}

export type GameFormState = { values: GameFormValues; errors: GameFormErrors; message: string | null };

// 公式戦の大会 ID を決める。新しい大会名なら、その年の大会として登録する(同名があればそれを使う)
async function resolveTournament(choice: TournamentChoice, gameDate: string): Promise<string | null | "error"> {
  if (choice === null) return null;
  if ("id" in choice) return choice.id;
  const supabase = await createClient();
  const season = Number(gameDate.slice(0, 4));
  const { data, error } = await supabase
    .from("tournaments")
    .upsert({ season, name: tournamentNameWithYear(choice.newName, season) }, { onConflict: "season,name" })
    .select("id")
    .single();
  return error || !data ? "error" : data.id;
}

export async function createGame(_prev: GameFormState, formData: FormData): Promise<GameFormState> {
  await requireEditor("/admin/games/new");
  const parsed = parseGameForm(formData);
  if (!parsed.ok) return { values: parsed.values, errors: parsed.errors, message: null };

  const tournamentId = await resolveTournament(parsed.tournament, parsed.record.game_date);
  if (tournamentId === "error") return { values: parsed.values, errors: {}, message: "大会の登録に失敗しました。" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .insert({ ...parsed.record, tournament_id: tournamentId })
    .select("id")
    .single();
  if (error || !data) return { values: parsed.values, errors: {}, message: "保存に失敗しました。もう一度お試しください。" };

  updateTag(STATS_TAG);
  // 予定なら試合の画面へ。結果まで入れたら参加者の登録へ
  redirect(parsed.record.status === "scheduled" ? `/admin/games/${data.id}` : `/admin/games/${data.id}/participants`);
}

export async function updateGame(_prev: GameFormState, formData: FormData): Promise<GameFormState> {
  const id = String(formData.get("id") ?? "");
  await requireEditor(`/admin/games/${id}/edit`);
  const parsed = parseGameForm(formData);
  if (!parsed.ok) return { values: parsed.values, errors: parsed.errors, message: null };
  if (!UUID.test(id)) return { values: parsed.values, errors: {}, message: "試合が見つかりません。" };

  const tournamentId = await resolveTournament(parsed.tournament, parsed.record.game_date);
  if (tournamentId === "error") return { values: parsed.values, errors: {}, message: "大会の登録に失敗しました。" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("games")
    .update({ ...parsed.record, tournament_id: tournamentId })
    .eq("id", id);
  if (error) return { values: parsed.values, errors: {}, message: "保存に失敗しました。もう一度お試しください。" };

  updateTag(STATS_TAG);
  // 予定の試合に結果を入れたら、そのまま参加者の登録へ
  const justFinished = formData.get("previousStatus") === "scheduled" && parsed.record.status === "completed";
  redirect(justFinished ? `/admin/games/${id}/participants` : `/admin/games/${id}`);
}

export type DeleteGameState = { message: string | null };

export async function deleteGame(_prev: DeleteGameState, formData: FormData): Promise<DeleteGameState> {
  const id = String(formData.get("id") ?? "");
  await requireEditor(`/admin/games/${id}`);
  if (!UUID.test(id)) return { message: "試合が見つかりません。" };

  const supabase = await createClient();
  // 参加者と打席結果も外部キーで一緒に消える
  const { data, error } = await supabase.from("games").delete().eq("id", id).select("season");
  if (error || !data?.length) return { message: "削除に失敗しました。" };

  updateTag(STATS_TAG);
  redirect(`/games?season=${data[0].season}`);
}

export type ParticipantsState = { errors: Record<string, string>; message: string | null };

export async function saveParticipants(_prev: ParticipantsState, formData: FormData): Promise<ParticipantsState> {
  const gameId = String(formData.get("gameId") ?? "");
  await requireEditor(`/admin/games/${gameId}/participants`);
  if (!UUID.test(gameId)) return { errors: {}, message: "試合が見つかりません。" };

  const playerIds = formData.getAll("player").map(String).filter((id) => UUID.test(id));
  const current = await getParticipantsForAdmin(gameId);
  const plan = planParticipants(
    current.map((p) => p.player_id),
    playerIds.map((playerId) => ({ playerId, battingOrder: String(formData.get(`order_${playerId}`) ?? "") })),
  );
  if (!plan.ok) return { errors: plan.errors, message: "入力内容を確認してください。" };

  const supabase = await createClient();
  if (plan.deletes.length > 0) {
    const { error } = await supabase
      .from("game_participants")
      .delete()
      .eq("game_id", gameId)
      .in("player_id", plan.deletes);
    if (error) return { errors: {}, message: "保存に失敗しました。もう一度お試しください。" };
  }
  if (plan.upserts.length > 0) {
    // 打順だけを更新し、打席外の盗塁など他の値はそのまま残す
    const { error } = await supabase
      .from("game_participants")
      .upsert(
        plan.upserts.map((u) => ({ game_id: gameId, ...u })),
        { onConflict: "game_id,player_id" },
      );
    if (error) {
      updateTag(STATS_TAG);
      return { errors: {}, message: "保存に失敗しました。もう一度お試しください。" };
    }
  }

  updateTag(STATS_TAG);
  // 入力の流れ: 参加者を登録 → 打撃入力
  redirect(plan.upserts.length > 0 ? `/admin/games/${gameId}/batting` : `/admin/games/${gameId}`);
}
