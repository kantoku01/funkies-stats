"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { PlayerFormValues } from "@/lib/players/form";
import type { PlayerFormState } from "./actions";

type Props = {
  action: (prev: PlayerFormState, formData: FormData) => Promise<PlayerFormState>;
  initial: PlayerFormValues;
  playerId?: string;
  season: number;
  inheritedNote?: string | null; // 「2026年の番号を引き継いでいます」など
  submitLabel: string;
};

const inputBase = "block min-h-11 rounded-md border border-slate-300 bg-white px-3 text-base";
const inputClass = `${inputBase} w-full`;

export function PlayerForm({ action, initial, playerId, season, inheritedNote, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, { values: initial, errors: {}, message: null });
  const [kind, setKind] = useState(initial.kind);
  const [carpool, setCarpool] = useState(initial.carpoolGroup);
  const v = state.values;

  return (
    // 入力エラーで戻ってきたときに値を復元するため、key で作り直す
    <form key={JSON.stringify(v)} action={formAction} className="space-y-5" noValidate>
      {playerId && <input type="hidden" name="id" value={playerId} />}
      <input type="hidden" name="season" value={season} />

      {state.message && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.message}
        </p>
      )}

      <Field label="氏名(フルネーム)" error={state.errors.fullName}>
        <input name="fullName" defaultValue={v.fullName} required autoComplete="off" className={inputClass} />
      </Field>

      <fieldset className="space-y-1">
        <legend className="text-sm font-medium">区分</legend>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["regular", "正規メンバー"],
              ["guest", "助っ人"],
              ["manager", "マネージャー"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className="flex min-h-11 items-center justify-center whitespace-nowrap rounded-md border border-slate-300 bg-white px-1 text-sm has-[:checked]:border-brand-600 has-[:checked]:bg-brand-600 has-[:checked]:font-bold has-[:checked]:text-white"
            >
              <input
                type="radio"
                name="kind"
                value={value}
                defaultChecked={v.kind === value}
                onChange={() => setKind(value)}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
        {state.errors.kind && <p className="text-sm text-red-700">{state.errors.kind}</p>}
      </fieldset>

      {kind !== "guest" && (
        <Field
          label={`${season}年の背番号`}
          error={state.errors.number}
          hint={inheritedNote ?? "空欄にすると前のシーズンの番号を引き継ぎます。"}
        >
          <input
            name="number"
            defaultValue={v.number}
            inputMode="numeric"
            maxLength={3}
            autoComplete="off"
            className={`${inputBase} w-24`}
          />
        </Field>
      )}

      {kind === "regular" && (
        <fieldset className="space-y-1">
          <legend className="text-sm font-medium">配車</legend>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["A", "グループA"],
                ["B", "グループB"],
                ["individual", "個別"],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className="flex min-h-11 items-center justify-center whitespace-nowrap rounded-md border border-slate-300 bg-white px-1 text-sm has-[:checked]:border-brand-600 has-[:checked]:bg-brand-600 has-[:checked]:font-bold has-[:checked]:text-white"
              >
                <input
                  type="radio"
                  name="carpoolGroup"
                  value={value}
                  checked={carpool === value}
                  onChange={() => setCarpool(value)}
                  // もう一度押すと未設定に戻す
                  onClick={() => carpool === value && setCarpool("")}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-500">試合前日の LINE の配車の欄で使います。未設定の人は「個別」に入ります。</p>
        </fieldset>
      )}

      <Field
        label={kind === "guest" ? "加入日(任意)" : "加入日"}
        error={state.errors.joinedOn}
        hint="選手の試合数は、加入日以降のチーム試合数で数えます。"
      >
        <input type="date" name="joinedOn" defaultValue={v.joinedOn} className={inputClass} />
      </Field>

      <Field label="退団日(在籍中は空欄)" error={state.errors.leftOn}>
        <input type="date" name="leftOn" defaultValue={v.leftOn} className={inputClass} />
      </Field>

      <div className="flex gap-2">
        <Link
          href={`/admin/players?season=${season}`}
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

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error ? <span className="block text-sm text-red-700">{error}</span> : hint && <span className="block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}
