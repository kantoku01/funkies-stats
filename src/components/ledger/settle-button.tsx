"use client";

import { useActionState, useState } from "react";
import { settleAdvance, unsettleAdvance, type LedgerActionState } from "@/app/admin/ledger/actions";

// 立て替えを「今日、部費から精算した」にする(編集者だけに表示)。
// 振込手数料(部費で持つ)と、同じ人の未精算をまとめて精算するかを選べる
export function SettleButton({
  entryId,
  label,
  siblings,
}: {
  entryId: string;
  label: string;
  siblings?: { count: number; total: string }; // 同じ人の未精算(この件を含む)が2件以上あるとき
}) {
  const [state, formAction, pending] = useActionState<LedgerActionState, FormData>(settleAdvance, { message: null });
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-9 rounded-md border border-brand-600 px-2 text-xs font-bold text-brand-700"
      >
        精算済みにする
      </button>
    );
  }
  return (
    <form action={formAction} className="w-44 space-y-2 rounded-md border border-brand-200 bg-brand-50 p-2 text-xs">
      <input type="hidden" name="id" value={entryId} />
      <p className="font-bold">{label}を、今日部費から精算</p>
      {siblings && (
        <label className="flex items-start gap-1">
          <input type="checkbox" name="together" className="mt-0.5 size-4 accent-brand-600" />
          <span>
            同じ人の未精算をまとめて({siblings.count}件・{siblings.total})
          </span>
        </label>
      )}
      <label className="block space-y-1">
        <span>振込手数料(円・なければ空欄)</span>
        <input name="fee" inputMode="numeric" placeholder="145" className="block min-h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-base" />
      </label>
      <div className="flex gap-1">
        <button type="submit" disabled={pending} className="min-h-9 flex-1 rounded-md bg-brand-600 font-bold text-white disabled:opacity-60">
          {pending ? "処理中…" : "精算する"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-9 rounded-md border border-slate-300 bg-white px-2">
          やめる
        </button>
      </div>
      {state.message && <p className="text-red-700">{state.message}</p>}
    </form>
  );
}

// 精算済みを取り消して、未精算に戻す(編集者だけに表示)
export function UnsettleButton({ entryId, label }: { entryId: string; label: string }) {
  const [state, formAction, pending] = useActionState<LedgerActionState, FormData>(unsettleAdvance, { message: null });
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(`${label}を、未精算に戻します。よろしいですか?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={entryId} />
      <button
        type="submit"
        disabled={pending}
        className="min-h-9 rounded-md border border-slate-400 px-2 text-xs font-bold text-slate-700 disabled:opacity-60"
      >
        {pending ? "処理中…" : "未精算に戻す"}
      </button>
      {state.message && <p className="text-xs text-red-700">{state.message}</p>}
    </form>
  );
}
