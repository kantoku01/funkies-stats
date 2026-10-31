"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentEditor } from "@/lib/auth";
import { STATS_TAG } from "@/lib/data/stats";
import { getPlayersForAdmin, playerHasRecords } from "@/lib/data/players";
import { parsePlayerForm, type PlayerFormErrors, type PlayerFormValues } from "@/lib/players/form";
import { findNumberConflict } from "@/lib/players/numbers";
import { resolveNumber } from "@/lib/stats";
import { createClient } from "@/lib/supabase/server";

export type PlayerFormState = {
  values: PlayerFormValues;
  errors: PlayerFormErrors;
  message: string | null;
};

function parseSeason(formData: FormData): number | null {
  const n = Number(formData.get("season"));
  return Number.isInteger(n) && n >= 2000 && n <= 2100 ? n : null;
}

async function requireEditor() {
  // 画面は編集者にしか出さないが、Server Action は直接呼べるのでここでも確認する(DB の RLS でも拒否される)
  if (!(await getCurrentEditor())) redirect("/login?next=/admin/players");
}

// 背番号をシーズンに設定する。空欄なら、そのシーズンの行を消して前シーズンからの引き継ぎに戻す
async function saveNumber(playerId: string, season: number, number: string): Promise<string | null> {
  const supabase = await createClient();
  const { players, numbers } = await getPlayersForAdmin();

  if (number === "") {
    const { error } = await supabase.from("season_numbers").delete().eq("season", season).eq("player_id", playerId);
    return error ? "背番号の保存に失敗しました。" : null;
  }
  // 引き継ぎで同じ番号になっているだけなら、行は増やさない
  if (resolveNumber(numbers, playerId, season) === number) return null;

  const conflict = findNumberConflict(numbers, players, season, playerId, number);
  if (conflict) return `背番号 ${number} は ${conflict.fullName} さんが${season}年に使っています。`;

  const { error } = await supabase
    .from("season_numbers")
    .upsert({ season, player_id: playerId, number }, { onConflict: "season,player_id" });
  return error ? "背番号の保存に失敗しました。" : null;
}

export async function createPlayer(_prev: PlayerFormState, formData: FormData): Promise<PlayerFormState> {
  await requireEditor();
  const parsed = parsePlayerForm(formData);
  const season = parseSeason(formData);
  if (!parsed.ok) return { values: parsed.values, errors: parsed.errors, message: null };
  if (season === null) return { values: parsed.values, errors: {}, message: "シーズンが正しくありません。" };
  const v = parsed.values;

  // 番号の重複は登録前に確認する(選手だけ登録されて番号が入らない状態を避ける)
  if (v.number) {
    const { players, numbers } = await getPlayersForAdmin();
    const conflict = findNumberConflict(numbers, players, season, null, v.number);
    if (conflict) {
      return {
        values: v,
        errors: { number: `背番号 ${v.number} は ${conflict.fullName} さんが${season}年に使っています。` },
        message: null,
      };
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .insert({
      full_name: v.fullName,
      kind: v.kind,
      joined_on: v.joinedOn || null,
      left_on: v.leftOn || null,
      carpool_group: v.carpoolGroup || null,
    })
    .select("id")
    .single();
  if (error || !data) return { values: v, errors: {}, message: "登録に失敗しました。もう一度お試しください。" };

  if (v.number) {
    const numberError = await saveNumber(data.id, season, v.number);
    if (numberError) {
      updateTag(STATS_TAG);
      return { values: v, errors: { number: numberError }, message: "選手は登録しましたが、背番号は保存できませんでした。" };
    }
  }

  updateTag(STATS_TAG);
  redirect(`/admin/players?season=${season}`);
}

export async function updatePlayer(_prev: PlayerFormState, formData: FormData): Promise<PlayerFormState> {
  await requireEditor();
  const id = String(formData.get("id") ?? "");
  const parsed = parsePlayerForm(formData);
  const season = parseSeason(formData);
  if (!parsed.ok) return { values: parsed.values, errors: parsed.errors, message: null };
  if (!id || season === null) return { values: parsed.values, errors: {}, message: "入力内容が正しくありません。" };
  const v = parsed.values;

  const supabase = await createClient();
  const { error } = await supabase
    .from("players")
    .update({
      full_name: v.fullName,
      kind: v.kind,
      joined_on: v.joinedOn || null,
      left_on: v.leftOn || null,
      carpool_group: v.carpoolGroup || null,
    })
    .eq("id", id);
  if (error) return { values: v, errors: {}, message: "保存に失敗しました。もう一度お試しください。" };

  // 助っ人に変えた場合は、そのシーズンの番号を外す
  const numberError = await saveNumber(id, season, v.kind === "guest" ? "" : v.number);
  updateTag(STATS_TAG);
  if (numberError) return { values: v, errors: { number: numberError }, message: null };

  redirect(`/admin/players?season=${season}`);
}

export type DeleteState = { message: string | null };

export async function deletePlayer(_prev: DeleteState, formData: FormData): Promise<DeleteState> {
  await requireEditor();
  const id = String(formData.get("id") ?? "");
  const season = parseSeason(formData);

  // 記録(試合の参加・初期値・入出金)のある選手を消すと合計が変わるので消させない
  if (await playerHasRecords(id)) {
    return { message: "試合や経費の記録があるため削除できません。辞めた選手は退団日を入れてください。" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("players").delete().eq("id", id);
  if (error) {
    return {
      message:
        error.code === "23503"
          ? "試合や経費の記録があるため削除できません。辞めた選手は退団日を入れてください。"
          : "削除に失敗しました。",
    };
  }

  updateTag(STATS_TAG);
  redirect(`/admin/players${season ? `?season=${season}` : ""}`);
}
