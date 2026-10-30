"use client";

import { useActionState } from "react";
import { deleteLedgerEntry, type LedgerActionState } from "../actions";

export function DeleteLedgerButton({ entryId, label }: { entryId: string; label: string }) {
  const [state, formAction, pending] = useActionState<LedgerActionState, FormData>(deleteLedgerEntry, { message: null });
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(`${label}を削除します。元に戻せません。よろしいですか?`)) e.preventDefault();
      }}
      className="space-y-2"
    >
      <input type="hidden" name="id" value={entryId} />
      {state.message && (
        <p role="alert" className="text-sm text-red-700">
          {state.message}
        </p>
      )}
      <button type="submit" disabled={pending} className="min-h-11 w-full rounded-md border border-red-300 bg-white text-red-700 disabled:opacity-60">
        {pending ? "削除中…" : "この記録を削除"}
      </button>
    </form>
  );
}
