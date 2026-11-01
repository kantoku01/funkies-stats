"use server";

import { updateTag } from "next/cache";
import { getCurrentEditor } from "@/lib/auth";
import { LEDGER_TAG } from "@/lib/data/ledger";
import { STATS_TAG } from "@/lib/data/stats";
import { parseCostForm } from "@/lib/games/costs";
import { SETTLED_MESSAGE, saveGameCostRecord } from "@/lib/games/costs-server";
import { createClient } from "@/lib/supabase/server";

export type CostState = { message: string | null; ok?: boolean };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 当日のお金を足す・直す。払う人が決まっていれば、こちらの負担分を経費に記録する(未定なら記録しない)
export async function saveGameCost(_prev: CostState, formData: FormData): Promise<CostState> {
  if (!(await getCurrentEditor())) return { message: "編集者としてログインしてください。" };
  const gameId = String(formData.get("gameId") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(gameId) || (id && !UUID.test(id))) return { message: "試合が見つかりません。" };
  const parsed = parseCostForm(formData);
  if (!parsed.ok) return { message: parsed.error };

  const supabase = await createClient();
  const { data: game } = await supabase.from("games").select("id, game_date, opponent").eq("id", gameId).maybeSingle();
  if (!game) return { message: "試合が見つかりません。" };
  const error = await saveGameCostRecord(supabase, game, parsed.values, id || undefined);
  if (error) return { message: error };

  updateTag(STATS_TAG);
  updateTag(LEDGER_TAG);
  return { message: null, ok: true };
}

// 当日のお金を消す。記録した経費も消す(精算済みは消さない)
export async function deleteGameCost(_prev: CostState, formData: FormData): Promise<CostState> {
  if (!(await getCurrentEditor())) return { message: "編集者としてログインしてください。" };
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return { message: "見つかりません。" };
  const supabase = await createClient();
  const { data: cost } = await supabase.from("game_costs").select("ledger_entry_id").eq("id", id).maybeSingle();
  if (!cost) return { message: "見つかりません。" };
  if (cost.ledger_entry_id) {
    const { data: entry } = await supabase.from("ledger_entries").select("settled_on").eq("id", cost.ledger_entry_id).maybeSingle();
    if (entry?.settled_on) return { message: SETTLED_MESSAGE };
  }
  const { error } = await supabase.from("game_costs").delete().eq("id", id);
  if (error) return { message: "削除に失敗しました。" };
  if (cost.ledger_entry_id) await supabase.from("ledger_entries").delete().eq("id", cost.ledger_entry_id);
  updateTag(STATS_TAG);
  updateTag(LEDGER_TAG);
  return { message: null, ok: true };
}
