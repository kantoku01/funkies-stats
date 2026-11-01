import "server-only";
import { COST_ITEM_LABEL, costLedgerCategory, ourShare, type CostFormValues, type CostItem } from "@/lib/games/costs";
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

// 経費の種類から当日のお金の項目へ(グラウンド・審判代は「グラウンド代＋審判代」)
function itemFromCategory(category: string): CostItem {
  return category === "ground" ? "ground_umpire" : category === "opponent" ? "opponent" : "other";
}

type LedgerSide = { id: string; kind: "income" | "expense"; category: string; amount: number; player_id: string | null; game_id: string | null };

// 経費の画面で入れた・直した記録を、試合の当日のお金にも反映する。
// 試合に紐づいた支出なら当日のお金を作る・直す(金額は こちらの負担 + 相手チームの分)。
// 試合から外れた・支出でなくなったら、当日のお金は「払う人未定」に戻す
export async function syncGameCostFromLedger(supabase: Supabase, entry: LedgerSide): Promise<void> {
  const { data: cost } = await supabase
    .from("game_costs")
    .select("id, game_id, item, opponent_share")
    .eq("ledger_entry_id", entry.id)
    .maybeSingle();
  const linked = entry.kind === "expense" && entry.game_id !== null;
  if (cost && (!linked || cost.game_id !== entry.game_id)) {
    await detachGameCostFromLedger(supabase, entry.id);
  }
  if (!linked) return;

  const sameGame = cost && cost.game_id === entry.game_id;
  const item = sameGame && costLedgerCategory(cost.item) === entry.category ? cost.item : itemFromCategory(entry.category);
  const share = sameGame && item !== "opponent" ? cost.opponent_share : 0;
  const row = {
    game_id: entry.game_id!,
    item,
    amount: entry.amount + share,
    opponent_share: share,
    payer: entry.player_id ? ("player" as const) : ("club" as const),
    player_id: entry.player_id,
    ledger_entry_id: entry.id,
  };
  if (sameGame) await supabase.from("game_costs").update(row).eq("id", cost.id);
  else await supabase.from("game_costs").insert(row);
}

// 経費の記録が試合から外れたとき: 紐づいた当日のお金は残し、払う人を「未定」に戻す
export async function detachGameCostFromLedger(supabase: Supabase, ledgerEntryId: string): Promise<void> {
  await supabase
    .from("game_costs")
    .update({ ledger_entry_id: null, payer: "undecided", player_id: null })
    .eq("ledger_entry_id", ledgerEntryId);
}

// 経費の記録を消すとき: 紐づいた当日のお金も消す
export async function deleteGameCostOfLedger(supabase: Supabase, ledgerEntryId: string): Promise<void> {
  await supabase.from("game_costs").delete().eq("ledger_entry_id", ledgerEntryId);
}
