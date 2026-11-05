"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentEditor } from "@/lib/auth";
import { getParticipantsForAdmin } from "@/lib/data/games";
import { STATS_TAG } from "@/lib/data/stats";
import { parseGameForm, tournamentNameWithYear, type GameFormErrors, type GameFormValues, type TournamentChoice } from "@/lib/games/form";
import { planParticipants } from "@/lib/games/participants";
import { LEDGER_TAG } from "@/lib/data/ledger";
import { parseCostRows } from "@/lib/games/costs";
import { SETTLED_MESSAGE, saveGameCostRecord } from "@/lib/games/costs-server";
import { parseActivityNote } from "@/lib/schedule/month";
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

  const costs = parseCostRows(parsed.values.costs ?? "");
  if (!costs.ok) return { values: parsed.values, errors: {}, message: costs.error };

  const tournamentId = await resolveTournament(parsed.tournament, parsed.record.game_date);
  if (tournamentId === "error") return { values: parsed.values, errors: {}, message: "大会の登録に失敗しました。" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .insert({ ...parsed.record, tournament_id: tournamentId })
    .select("id")
    .single();
  if (error || !data) return { values: parsed.values, errors: {}, message: "保存に失敗しました。もう一度お試しください。" };

  // 一緒に入れた当日のお金(払う人が決まっていれば経費にも記録)
  const game = { id: data.id, game_date: parsed.record.game_date, opponent: parsed.record.opponent };
  for (const cost of costs.values) await saveGameCostRecord(supabase, game, cost);

  if (costs.values.length > 0) updateTag(LEDGER_TAG);

  // 活動予定から試合の予定にしたら、メモから時間・場所を外す(試合の枠に出るので)。残りのメモ(忘年会など)は残す
  const scheduleDay = String(formData.get("scheduleDay") ?? "");
  if (scheduleDay && scheduleDay === parsed.record.game_date) {
    const { data: date } = await supabase.from("schedule_dates").select("note").eq("day", scheduleDay).maybeSingle();
    if (date) await supabase.from("schedule_dates").update({ note: parseActivityNote(date.note).rest }).eq("day", scheduleDay);
  }

  updateTag(STATS_TAG);
  // 予定なら試合の画面へ。結果まで入れたら参加者の登録へ
  if (scheduleDay && parsed.record.status === "scheduled") redirect(`/schedule/${scheduleDay.slice(0, 7)}`);
  redirect(parsed.record.status === "completed" ? `/admin/games/${data.id}/participants` : `/admin/games/${data.id}`);
}

export async function updateGame(_prev: GameFormState, formData: FormData): Promise<GameFormState> {
  const id = String(formData.get("id") ?? "");
  await requireEditor(`/admin/games/${id}/edit`);
  const parsed = parseGameForm(formData);
  if (!parsed.ok) return { values: parsed.values, errors: parsed.errors, message: null };
  if (!UUID.test(id)) return { values: parsed.values, errors: {}, message: "試合が見つかりません。" };

  // 当日のお金(同じ画面で直す)。消す行に精算済みの立て替えがあれば、先に止める
  const costs = parseCostRows(parsed.values.costs ?? "");
  if (!costs.ok) return { values: parsed.values, errors: {}, message: costs.error };
  const supabase = await createClient();
  const { data: existing } = await supabase.from("game_costs").select("id, ledger_entry_id").eq("game_id", id);
  const kept = new Set(costs.values.map((c) => c.id).filter(Boolean));
  const removed = (existing ?? []).filter((c) => !kept.has(c.id));
  const removedLedger = removed.map((c) => c.ledger_entry_id).filter((x): x is string => x !== null);
  if (removedLedger.length > 0) {
    const { data: settled } = await supabase.from("ledger_entries").select("id").in("id", removedLedger).not("settled_on", "is", null);
    if (settled?.length) return { values: parsed.values, errors: {}, message: `消した当日のお金に${SETTLED_MESSAGE}` };
  }

  const tournamentId = await resolveTournament(parsed.tournament, parsed.record.game_date);
  if (tournamentId === "error") return { values: parsed.values, errors: {}, message: "大会の登録に失敗しました。" };

  const { error } = await supabase
    .from("games")
    .update({ ...parsed.record, tournament_id: tournamentId })
    .eq("id", id);
  if (error) return { values: parsed.values, errors: {}, message: "保存に失敗しました。もう一度お試しください。" };

  // 消した行は経費の記録も消す。残した行・足した行は保存し直す(試合日や相手が変わっても経費の記録がそろう)
  if (removed.length > 0) await supabase.from("game_costs").delete().in("id", removed.map((c) => c.id));
  if (removedLedger.length > 0) await supabase.from("ledger_entries").delete().in("id", removedLedger);
  const game = { id, game_date: parsed.record.game_date, opponent: parsed.record.opponent };
  for (const cost of costs.values) {
    const costError = await saveGameCostRecord(supabase, game, cost, cost.id ?? undefined);
    if (costError) return { values: parsed.values, errors: {}, message: `試合は保存しました。当日のお金: ${costError}` };
  }

  updateTag(STATS_TAG);
  updateTag(LEDGER_TAG);
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
