"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentEditor } from "@/lib/auth";
import { LEDGER_TAG } from "@/lib/data/ledger";
import { STATS_TAG } from "@/lib/data/stats";
import { deleteGameCostOfLedger, syncGameCostFromLedger } from "@/lib/games/costs-server";
import { parseLedgerForm, type LedgerFormErrors, type LedgerFormValues } from "@/lib/ledger/form";
import { todayInJapan } from "@/lib/season";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireEditor(next: string) {
  // Server Action は直接呼べるのでここでも確認する(DB の RLS でも拒否される)
  if (!(await getCurrentEditor())) redirect(`/login?next=${encodeURIComponent(next)}`);
}

export type LedgerFormState = { values: LedgerFormValues; errors: LedgerFormErrors; message: string | null };

const seasonOf = (date: string) => date.slice(0, 4);

export async function createLedgerEntry(_prev: LedgerFormState, formData: FormData): Promise<LedgerFormState> {
  await requireEditor("/admin/ledger/new");
  const parsed = parseLedgerForm(formData);
  if (!parsed.ok) return { values: parsed.values, errors: parsed.errors, message: null };

  const supabase = await createClient();
  const { data, error } = await supabase.from("ledger_entries").insert(parsed.record).select("id").single();
  if (error || !data) return { values: parsed.values, errors: {}, message: "保存に失敗しました。もう一度お試しください。" };
  // 試合に紐づいた支出は、その試合の当日のお金にも出す
  await syncGameCostFromLedger(supabase, { id: data.id, ...parsed.record });

  updateTag(LEDGER_TAG);
  updateTag(STATS_TAG);
  redirect(`/expenses?season=${seasonOf(parsed.record.entry_date)}`);
}

export async function updateLedgerEntry(_prev: LedgerFormState, formData: FormData): Promise<LedgerFormState> {
  const id = String(formData.get("id") ?? "");
  await requireEditor(`/admin/ledger/${id}`);
  const parsed = parseLedgerForm(formData);
  if (!parsed.ok) return { values: parsed.values, errors: parsed.errors, message: null };
  if (!UUID.test(id)) return { values: parsed.values, errors: {}, message: "記録が見つかりません。" };

  const supabase = await createClient();
  const { error } = await supabase.from("ledger_entries").update(parsed.record).eq("id", id);
  if (error) return { values: parsed.values, errors: {}, message: "保存に失敗しました。もう一度お試しください。" };
  // 試合の当日のお金とつながっていれば、そちらも直す
  await syncGameCostFromLedger(supabase, { id, ...parsed.record });

  updateTag(LEDGER_TAG);
  updateTag(STATS_TAG);
  redirect(`/expenses?season=${seasonOf(parsed.record.entry_date)}`);
}

export type LedgerActionState = { message: string | null };

export async function deleteLedgerEntry(_prev: LedgerActionState, formData: FormData): Promise<LedgerActionState> {
  const id = String(formData.get("id") ?? "");
  await requireEditor(`/admin/ledger/${id}`);
  if (!UUID.test(id)) return { message: "記録が見つかりません。" };

  const supabase = await createClient();
  await deleteGameCostOfLedger(supabase, id);
  const { data, error } = await supabase.from("ledger_entries").delete().eq("id", id).select("season");
  if (error || !data?.length) return { message: "削除に失敗しました。" };

  updateTag(LEDGER_TAG);
  updateTag(STATS_TAG);
  redirect(`/expenses?season=${data[0].season}`);
}

// 立て替えを「今日、部費から精算した」にする
// together が on なら、同じ人の未精算をまとめて精算する(1回の振込)。
// 振込手数料は部費で持つので、入れたら「その他(振込手数料)」の支出として精算日に記録する
export async function settleAdvance(_prev: LedgerActionState, formData: FormData): Promise<LedgerActionState> {
  const id = String(formData.get("id") ?? "");
  await requireEditor("/expenses");
  if (!UUID.test(id)) return { message: "記録が見つかりません。" };
  const feeRaw = String(formData.get("fee") ?? "")
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[,，円\s]/g, "");
  const fee = feeRaw === "" ? 0 : Number(feeRaw);
  if (!Number.isInteger(fee) || fee < 0 || fee > 10000) return { message: "振込手数料は0〜10,000円の数字で入れてください。" };

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("ledger_entries")
    .select("player_id")
    .eq("id", id)
    .eq("kind", "expense")
    .is("settled_on", null)
    .maybeSingle();
  if (!target?.player_id) return { message: "精算できませんでした。画面を開き直してください。" };

  const today = todayInJapan(new Date());
  let query = supabase.from("ledger_entries").update({ settled_on: today }).eq("kind", "expense").is("settled_on", null);
  query = formData.get("together") === "on" ? query.eq("player_id", target.player_id) : query.eq("id", id);
  const { data, error } = await query.select("id");
  if (error || !data?.length) return { message: "精算できませんでした。画面を開き直してください。" };

  if (fee > 0) {
    const { data: player } = await supabase.from("players").select("full_name").eq("id", target.player_id).maybeSingle();
    const { error: feeError } = await supabase.from("ledger_entries").insert({
      entry_date: today,
      kind: "expense",
      category: "other_expense",
      amount: fee,
      memo: `振込手数料(${player?.full_name ?? ""}さんへの精算)`,
    });
    if (feeError) return { message: "精算はしましたが、振込手数料の記録に失敗しました。経費の追加から入れてください。" };
  }

  updateTag(LEDGER_TAG);
  return { message: null };
}

// 間違えて精算済みにした立て替えを、未精算に戻す
export async function unsettleAdvance(_prev: LedgerActionState, formData: FormData): Promise<LedgerActionState> {
  const id = String(formData.get("id") ?? "");
  await requireEditor("/expenses");
  if (!UUID.test(id)) return { message: "記録が見つかりません。" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ledger_entries")
    .update({ settled_on: null })
    .eq("id", id)
    .not("settled_on", "is", null)
    .select("id");
  if (error || !data?.length) return { message: "戻せませんでした。画面を開き直してください。" };

  updateTag(LEDGER_TAG);
  return { message: null };
}
