"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { resultFromScores, type GameFormValues } from "@/lib/games/form";
import { ROUND_SUGGESTIONS, STAGE_LABEL } from "@/lib/games/type-label";
import type { GameFormState } from "./actions";

type Props = {
  action: (prev: GameFormState, formData: FormData) => Promise<GameFormState>;
  initial: GameFormValues;
  gameId?: string;
  tournaments: { id: string; season: number; name: string }[];
  cancelHref: string;
  submitLabel: string;
};

const inputBase = "block min-h-11 rounded-md border border-slate-300 bg-white px-3 text-base";
const TOGGLE =
  "flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white has-[:checked]:border-brand-600 has-[:checked]:bg-brand-600 has-[:checked]:font-bold has-[:checked]:text-white";
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
  tournaments,
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
  const [gameDate, setGameDate] = useState(v.gameDate);
  const [gameType, setGameType] = useState(v.gameType);
  const [tournamentId, setTournamentId] = useState(v.tournamentId);
  const [stage, setStage] = useState(v.stage);
  // 大会は試合日と同じ年のものから選ぶ
  const seasonTournaments = tournaments.filter((t) => String(t.season) === gameDate.slice(0, 4));

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
        <input
          type="date"
          name="gameDate"
          value={gameDate}
          onChange={(e) => setGameDate(e.target.value)}
          required
          className={`${inputBase} w-full`}
        />
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

      {/* 試合の種類。公式戦は 大会 → 段階 → 回戦 */}
      <fieldset className="space-y-1">
        <legend className="text-sm font-medium">試合の種類</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["open", "オープン戦"],
              ["official", "公式戦"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className={TOGGLE}>
              <input
                type="radio"
                name="gameType"
                value={value}
                checked={gameType === value}
                onChange={() => setGameType(value)}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {gameType === "official" && (
        <div className="space-y-4 rounded-md bg-slate-50 p-3">
          <Field label="大会" error={state.errors.tournamentId}>
            <select
              name="tournamentId"
              value={tournamentId}
              onChange={(e) => setTournamentId(e.target.value)}
              className={`${inputBase} w-full`}
            >
              <option value="">選んでください</option>
              {seasonTournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
              <option value="new">+ 新しい大会を追加</option>
            </select>
          </Field>
          {tournamentId === "new" && (
            <Field label="新しい大会の名前" error={state.errors.newTournament}>
              <input name="newTournament" defaultValue={v.newTournament} autoComplete="off" className={`${inputBase} w-full`} />
            </Field>
          )}
          <fieldset className="space-y-1">
            <legend className="text-sm font-medium">段階</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["league", "knockout"] as const).map((value) => (
                <label key={value} className={TOGGLE}>
                  <input
                    type="radio"
                    name="stage"
                    value={value}
                    checked={stage === value}
                    onChange={() => setStage(value)}
                    className="sr-only"
                  />
                  {STAGE_LABEL[value]}
                </label>
              ))}
            </div>
            {state.errors.stage && <p className="text-sm text-red-700">{state.errors.stage}</p>}
          </fieldset>
          <Field label="回戦・ブロック(任意)" error={state.errors.roundLabel}>
            <input
              name="roundLabel"
              defaultValue={v.roundLabel}
              list="round-suggestions"
              autoComplete="off"
              placeholder={stage === "league" ? "例:Aブロック 第1戦" : "例:1回戦、準決勝"}
              className={`${inputBase} w-full`}
            />
            <datalist id="round-suggestions">
              {(stage ? ROUND_SUGGESTIONS[stage] : []).map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </Field>
        </div>
      )}

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
