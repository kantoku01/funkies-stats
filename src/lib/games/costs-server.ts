import "server-only";
import { COST_ITEM_LABEL, costLedgerCategory, ourShare, type CostFormValues } from "@/lib/games/costs";
import { formatYen } from "@/lib/ledger/categories";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Game = { id: string; game_date: string; opponent: string | null };

export const SETTLED_MESSAGE = "立て替えの精算が済んでいるので変えられません。経費の画面で精算を取り消してから直してください。";

// 当日のお金を1件保存する(id があれば直す)。払う人が決まっていれば、こちらの負担分を経費に記録する(未定なら記録しない)。
// 失敗したらその理由を返す
export async function saveGameCostRecord(supabase: Supabase, game: Game, v: CostFormValues, id?: string): Promise<string | null> {
  let ledgerId: string | null = null;
  if (id) {
    const { data: before } = await supabase.from("game_costs").select("ledger_entry_id").eq("id", id).eq("game_id", game.id).maybeSingle();
    if (!before) return "見つかりません。画面を読み込み直してください。";
    ledgerId = before.ledger_entry_id;
  }

  // 経費の記録(こちらの負担分)。精算済みの立て替えは変えない
  const share = ourShare({ amount: v.amount, opponent_share: v.opponentShare });
  const decided = v.payer !== "undecided" && share > 0;
  if (ledgerId) {
    const { data: entry } = await supabase.from("ledger_entries").select("amount, player_id, settled_on").eq("id", ledgerId).maybeSingle();
    if (entry?.settled_on && (!decided || entry.amount !== share || entry.player_id !== v.playerId)) return SETTLED_MESSAGE;
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
      game_id: game.id,
      memo: memo.slice(0, 200),
    };
    if (ledgerId) {
      const { error } = await supabase.from("ledger_entries").update(entry).eq("id", ledgerId);
      if (error) return "経費の記録に失敗しました。";
    } else {
      const { data, error } = await supabase.from("ledger_entries").insert(entry).select("id").single();
      if (error || !data) return "経費の記録に失敗しました。";
      ledgerId = data.id;
    }
  } else if (ledgerId) {
    await supabase.from("ledger_entries").delete().eq("id", ledgerId);
    ledgerId = null;
  }

  const row = {
    game_id: game.id,
    item: v.item,
    amount: v.amount,
    opponent_share: v.opponentShare,
    payer: v.payer,
    player_id: v.playerId,
    memo: v.memo,
    ledger_entry_id: ledgerId,
  };
  const { error } = id ? await supabase.from("game_costs").update(row).eq("id", id) : await supabase.from("game_costs").insert(row);
  return error ? "保存に失敗しました。" : null;
}
