"use client";

import { useActionState } from "react";
import { deletePlayer, type DeleteState } from "./actions";

export function DeletePlayerButton({ playerId, name, season }: { playerId: string; name: string; season: number }) {
  const [state, formAction, pending] = useActionState<DeleteState, FormData>(deletePlayer, { message: null });

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(`${name} さんを削除します。元に戻せません。よろしいですか?`)) e.preventDefault();
      }}
      className="space-y-2"
    >
      <input type="hidden" name="id" value={playerId} />
      <input type="hidden" name="season" value={season} />
      {state.message && (
        <p role="alert" className="text-sm text-red-700">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full rounded-md border border-red-300 bg-white text-red-700 disabled:opacity-60"
      >
        {pending ? "削除中…" : "この選手を削除"}
      </button>
    </form>
  );
}
