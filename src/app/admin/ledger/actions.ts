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
export async function settleAdvance(_prev: LedgerActionState, formData: FormData): Promise<LedgerActionState> {
  const id = String(formData.get("id") ?? "");
  await requireEditor("/expenses");
  if (!UUID.test(id)) return { message: "記録が見つかりません。" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ledger_entries")
    .update({ settled_on: todayInJapan(new Date()) })
    .eq("id", id)
    .eq("kind", "expense")
    .not("player_id", "is", null)
    .is("settled_on", null)
    .select("id");
  if (error || !data?.length) return { message: "精算できませんでした。画面を開き直してください。" };

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
