"use client";

import { useActionState } from "react";
import { deleteGame, type DeleteGameState } from "../actions";

export function DeleteGameButton({ gameId, label, participantCount, paCount }: {
  gameId: string;
  label: string;
  participantCount: number;
  paCount: number;
}) {
  const [state, formAction, pending] = useActionState<DeleteGameState, FormData>(deleteGame, { message: null });

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const detail = participantCount > 0 ? `\n参加者${participantCount}人と打席結果${paCount}件も一緒に消えます。` : "";
        if (!window.confirm(`${label}の試合を削除します。${detail}\n元に戻せません。よろしいですか?`)) e.preventDefault();
      }}
      className="space-y-2"
    >
      <input type="hidden" name="id" value={gameId} />
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
        {pending ? "削除中…" : "この試合を削除"}
      </button>
    </form>
  );
}
