"use server";

import { updateTag } from "next/cache";
import { getCurrentEditor } from "@/lib/auth";
import { validateBattingInput } from "@/lib/batting/entry";
import { STATS_TAG } from "@/lib/data/stats";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SaveBattingResult = { ok: true } | { ok: false; error: string };

// 1人分の打席結果を保存する(打撃入力画面から、選手を切り替えるときに呼ぶ)
export async function savePlayerBatting(
  gameId: string,
  playerId: string,
  entries: unknown,
  extraStolenBases: unknown,
): Promise<SaveBattingResult> {
  if (!(await getCurrentEditor())) return { ok: false, error: "ログインが切れました。ログインし直してください。" };
  if (!UUID.test(gameId) || !UUID.test(playerId)) return { ok: false, error: "試合または選手が正しくありません。" };

  const input = validateBattingInput(entries, extraStolenBases);
  if (!input.ok) return input;

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_player_batting", {
    p_game_id: gameId,
    p_player_id: playerId,
    p_plate_appearances: input.entries.map((e) => ({ result: e.result, rbi: e.rbi, stolen_bases: e.stolenBases })),
    p_extra_stolen_bases: input.extraStolenBases,
  });
  if (error) {
    return {
      ok: false,
      error:
        error.code === "P0002"
          ? "この選手は参加者から外されています。参加者登録を確認してください。"
          : "保存に失敗しました。通信状況を確認して、もう一度お試しください。",
    };
  }

  updateTag(STATS_TAG);
  return { ok: true };
}
