"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { resultFromScores, type GameFormValues } from "@/lib/games/form";
import type { GameFormState } from "./actions";

type Props = {
  action: (prev: GameFormState, formData: FormData) => Promise<GameFormState>;
  initial: GameFormValues;
  gameId?: string;
  cancelHref: string;
  submitLabel: string;
};

const inputBase = "block min-h-11 rounded-md border border-slate-300 bg-white px-3 text-base";
const RESULTS = [
  ["win", "勝ち"],
  ["lose", "負け"],
  ["draw", "引き分け"],
] as const;

export function GameForm(props: Props) {
  const [state, formAction, pending] = useActionState(props.action, {
    values: props.initial,
    errors: {},
    message: null,
  });
  // 入力エラーで戻ってきたら、その値でフォームを作り直す
  return <GameFormFields key={JSON.stringify(state.values)} {...props} state={state} formAction={formAction} pending={pending} />;
}

function GameFormFields({
  gameId,
  cancelHref,
  submitLabel,
  state,
  formAction,
  pending,
}: Props & { state: GameFormState; formAction: (fd: FormData) => void; pending: boolean }) {
  const v = state.values;
  const [teamScore, setTeamScore] = useState(v.teamScore);
  const [opponentScore, setOpponentScore] = useState(v.opponentScore);
  const [result, setResult] = useState(v.result);

  // スコアを両方入れたら勝敗を自動で選ぶ(手で変えることもできる)
  const onScore = (team: string, opp: string) => {
    setTeamScore(team);
    setOpponentScore(opp);
    const r = resultFromScores(team, opp);
    if (r) setResult(r);
  };

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {gameId && <input type="hidden" name="id" value={gameId} />}
      {state.message && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.message}
        </p>
      )}

      <Field label="試合日" error={state.errors.gameDate}>
        <input type="date" name="gameDate" defaultValue={v.gameDate} required className={`${inputBase} w-full`} />
      </Field>

      <Field label="対戦相手(任意)" error={state.errors.opponent}>
        <input name="opponent" defaultValue={v.opponent} autoComplete="off" className={`${inputBase} w-full`} />
      </Field>

      <div className="space-y-1">
        <span className="text-sm font-medium">スコア(任意)</span>
        <div className="flex items-center gap-2">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-xs text-slate-500">ファンキーズ</span>
            <input
              name="teamScore"
              inputMode="numeric"
              value={teamScore}
              onChange={(e) => onScore(e.target.value, opponentScore)}
              className={`${inputBase} w-full text-center text-lg`}
            />
          </label>
          <span className="pt-5 text-slate-400">−</span>
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-xs text-slate-500">相手</span>
            <input
              name="opponentScore"
              inputMode="numeric"
              value={opponentScore}
              onChange={(e) => onScore(teamScore, e.target.value)}
              className={`${inputBase} w-full text-center text-lg`}
            />
          </label>
        </div>
        {(state.errors.teamScore || state.errors.opponentScore) && (
          <p className="text-sm text-red-700">{state.errors.teamScore ?? state.errors.opponentScore}</p>
        )}
      </div>

      <fieldset className="space-y-1">
        <legend className="text-sm font-medium">勝敗</legend>
        <div className="grid grid-cols-3 gap-2">
          {RESULTS.map(([value, label]) => (
            <label
              key={value}
              className="flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white has-[:checked]:border-brand-600 has-[:checked]:bg-brand-600 has-[:checked]:font-bold has-[:checked]:text-white"
            >
              <input
                type="radio"
                name="result"
                value={value}
                checked={result === value}
                onChange={() => setResult(value)}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
        {state.errors.result && <p className="text-sm text-red-700">{state.errors.result}</p>}
      </fieldset>

      <Field label="メモ(任意)" error={state.errors.memo}>
        <textarea name="memo" defaultValue={v.memo} rows={2} className={`${inputBase} w-full py-2`} />
      </Field>

      <div className="flex gap-2">
        <Link
          href={cancelHref}
          className="flex min-h-11 flex-1 items-center justify-center rounded-md border border-slate-300 bg-white"
        >
          キャンセル
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 flex-1 rounded-md bg-brand-600 font-bold text-white disabled:opacity-60"
        >
          {pending ? "保存中…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error && <span className="block text-sm text-red-700">{error}</span>}
    </label>
  );
}
