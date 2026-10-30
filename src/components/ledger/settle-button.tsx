"use client";

import { useActionState } from "react";
import { settleAdvance, type LedgerActionState } from "@/app/admin/ledger/actions";

// 立て替えを「今日、部費から精算した」にする(編集者だけに表示)
export function SettleButton({ entryId, label }: { entryId: string; label: string }) {
  const [state, formAction, pending] = useActionState<LedgerActionState, FormData>(settleAdvance, { message: null });
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(`${label}を、今日部費から精算したことにします。よろしいですか?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={entryId} />
      <button
        type="submit"
        disabled={pending}
        className="min-h-9 rounded-md border border-brand-600 px-2 text-xs font-bold text-brand-700 disabled:opacity-60"
      >
        {pending ? "処理中…" : "精算済みにする"}
      </button>
      {state.message && <p className="text-xs text-red-700">{state.message}</p>}
    </form>
  );
}
