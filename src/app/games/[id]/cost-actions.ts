"use server";

import { updateTag } from "next/cache";
import { getCurrentEditor } from "@/lib/auth";
import { LEDGER_TAG } from "@/lib/data/ledger";
import { STATS_TAG } from "@/lib/data/stats";
import { COST_ITEM_LABEL, costLedgerCategory, ourShare, parseCostForm } from "@/lib/games/costs";
import { formatYen } from "@/lib/ledger/categories";
import { createClient } from "@/lib/supabase/server";

export type CostState = { message: string | null; ok?: boolean };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SETTLED = "立て替えの精算が済んでいるので変えられません。経費の画面で精算を取り消してから直してください。";

// 当日のお金を足す・直す。払う人が決まっていれば、こちらの負担分を経費に記録する(未定なら記録しない)
export async function saveGameCost(_prev: CostState, formData: FormData): Promise<CostState> {
  if (!(await getCurrentEditor())) return { message: "編集者としてログインしてください。" };
  const gameId = String(formData.get("gameId") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(gameId) || (id && !UUID.test(id))) return { message: "試合が見つかりません。" };
  const parsed = parseCostForm(formData);
  if (!parsed.ok) return { message: parsed.error };
  const v = parsed.values;

  const supabase = await createClient();
  const { data: game } = await supabase.from("games").select("game_date, opponent").eq("id", gameId).maybeSingle();
  if (!game) return { message: "試合が見つかりません。" };

  const record = {
    game_id: gameId,
    item: v.item,
    amount: v.amount,
    opponent_share: v.opponentShare,
    payer: v.payer,
    player_id: v.playerId,
    memo: v.memo,
  };
  let ledgerId: string | null = null;
  if (id) {
    const { data: before } = await supabase.from("game_costs").select("ledger_entry_id").eq("id", id).eq("game_id", gameId).maybeSingle();
    if (!before) return { message: "見つかりません。画面を読み込み直してください。" };
    ledgerId = before.ledger_entry_id;
  }

  // 経費の記録(こちらの負担分)。精算済みの立て替えは変えない
  const share = ourShare({ amount: v.amount, opponent_share: v.opponentShare });
  const decided = v.payer !== "undecided" && share > 0;
  if (ledgerId) {
    const { data: entry } = await supabase.from("ledger_entries").select("amount, player_id, settled_on").eq("id", ledgerId).maybeSingle();
    if (entry?.settled_on && (!decided || entry.amount !== share || entry.player_id !== v.playerId)) return { message: SETTLED };
  }
  const memo = [
    `${COST_ITEM_LABEL[v.item]}${game.opponent ? `(vs ${game.opponent})` : ""}`,
    v.opponentShare > 0 ? `総額${formatYen(v.amount)}・うち相手チームから${formatYen(v.opponentShare)}` : null,
    v.memo,
  ]
    .filter(Boolean)
    .join(" ");
  if (decided) {
    const entry = {
      entry_date: game.game_date,
      kind: "expense" as const,
      category: costLedgerCategory(v.item),
      amount: share,
      player_id: v.playerId,
      game_id: gameId,
      memo: memo.slice(0, 200),
    };
    if (ledgerId) {
      const { error } = await supabase.from("ledger_entries").update(entry).eq("id", ledgerId);
      if (error) return { message: "経費の記録に失敗しました。" };
    } else {
      const { data, error } = await supabase.from("ledger_entries").insert(entry).select("id").single();
      if (error || !data) return { message: "経費の記録に失敗しました。" };
      ledgerId = data.id;
    }
  } else if (ledgerId) {
    await supabase.from("ledger_entries").delete().eq("id", ledgerId);
    ledgerId = null;
  }

  const row = { ...record, ledger_entry_id: ledgerId };
  const { error } = id
    ? await supabase.from("game_costs").update(row).eq("id", id)
    : await supabase.from("game_costs").insert(row);
  if (error) return { message: "保存に失敗しました。" };

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
    if (entry?.settled_on) return { message: SETTLED };
  }
  const { error } = await supabase.from("game_costs").delete().eq("id", id);
  if (error) return { message: "削除に失敗しました。" };
  if (cost.ledger_entry_id) await supabase.from("ledger_entries").delete().eq("id", cost.ledger_entry_id);
  updateTag(STATS_TAG);
  updateTag(LEDGER_TAG);
  return { message: null, ok: true };
}
