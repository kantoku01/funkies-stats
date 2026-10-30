"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { formatGameDate } from "@/lib/format";
import { CATEGORY_LABEL, categoriesOf, type LedgerKind } from "@/lib/ledger/categories";
import type { LedgerFormValues } from "@/lib/ledger/form";
import type { LedgerFormState } from "./actions";

type Props = {
  action: (prev: LedgerFormState, formData: FormData) => Promise<LedgerFormState>;
  initial: LedgerFormValues;
  entryId?: string;
  players: { id: string; full_name: string; kind: string; left_on: string | null }[];
  games: { id: string; game_date: string; opponent: string | null }[];
  submitLabel: string;
};

const input = "block min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base";
const toggle =
  "flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white has-[:checked]:border-brand-600 has-[:checked]:bg-brand-600 has-[:checked]:font-bold has-[:checked]:text-white";

export function LedgerForm(props: Props) {
  const [state, formAction, pending] = useActionState(props.action, {
    values: props.initial,
    errors: {},
    message: null,
  });
  // 入力エラーで戻ってきたら、その値でフォームを作り直す
  return <Fields key={JSON.stringify(state.values)} {...props} state={state} formAction={formAction} pending={pending} />;
}

function Fields({
  entryId,
  players,
  games,
  submitLabel,
  state,
  formAction,
  pending,
}: Props & { state: LedgerFormState; formAction: (fd: FormData) => void; pending: boolean }) {
  const v = state.values;
  const e = state.errors;
  const [kind, setKind] = useState<LedgerKind>(v.kind);
  const [category, setCategory] = useState(v.category);
  const [payer, setPayer] = useState(v.payer);
  const [settled, setSettled] = useState(v.settled);
  const [entryDate, setEntryDate] = useState(v.entryDate);

  const categories = categoriesOf(kind);
  const showPlayer = (kind === "income" && category === "dues") || (kind === "expense" && payer === "advance");
  // 年会費は正規メンバーだけ(マネージャーは年会費なし)、立て替えは全員から選ぶ(在籍中を先に)
  const playerOptions = players
    .filter((p) => kind === "expense" || p.kind === "regular")
    .sort((a, b) => (a.left_on ? 1 : 0) - (b.left_on ? 1 : 0));
  // 関連する試合は、日付と同じ年の試合から選ぶ
  const yearGames = games.filter((g) => g.game_date.slice(0, 4) === entryDate.slice(0, 4));

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {entryId && <input type="hidden" name="id" value={entryId} />}
      {state.message && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.message}
        </p>
      )}

      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="sr-only">収入か支出か</legend>
        {(
          [
            ["expense", "支出"],
            ["income", "収入"],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className={toggle}>
            <input
              type="radio"
              name="kind"
              value={value}
              checked={kind === value}
              onChange={() => {
                setKind(value);
                setCategory("");
              }}
              className="sr-only"
            />
            {label}
          </label>
        ))}
      </fieldset>

      <Field label="日付" error={e.entryDate}>
        <input type="date" name="entryDate" value={entryDate} onChange={(ev) => setEntryDate(ev.target.value)} className={input} />
      </Field>

      <Field label="項目" error={e.category}>
        <select name="category" value={category} onChange={(ev) => setCategory(ev.target.value as typeof category)} className={input}>
          <option value="">選んでください</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="金額(円)" error={e.amount}>
        <input name="amount" defaultValue={v.amount} inputMode="numeric" autoComplete="off" className={`${input} text-right text-lg`} />
      </Field>

      {kind === "expense" && (
        <fieldset className="space-y-1">
          <legend className="text-sm font-medium">支払い</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["club", "部費から直接"],
                ["advance", "立て替え"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className={toggle}>
                <input type="radio" name="payer" value={value} checked={payer === value} onChange={() => setPayer(value)} className="sr-only" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {showPlayer && (
        <Field label={kind === "income" ? "納入した選手" : "立て替えた人"} error={e.playerId}>
          <select name="playerId" defaultValue={v.playerId} className={input}>
            <option value="">選んでください</option>
            {playerOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
                {p.kind === "guest" ? "(助っ人)" : p.kind === "manager" ? "(マネージャー)" : ""}
                {p.left_on ? "(退団)" : ""}
              </option>
            ))}
          </select>
        </Field>
      )}

      {kind === "expense" && payer === "advance" && (
        <div className="space-y-2 rounded-md bg-slate-50 p-3">
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" name="settled" checked={settled} onChange={(ev) => setSettled(ev.target.checked)} className="size-5 accent-brand-600" />
            部費から精算済み
          </label>
          {settled && (
            <Field label="精算した日" error={e.settledOn}>
              <input type="date" name="settledOn" defaultValue={v.settledOn || entryDate} className={input} />
            </Field>
          )}
        </div>
      )}

      <Field label="関連する試合(任意)" error={e.gameId}>
        <select name="gameId" defaultValue={v.gameId} className={input}>
          <option value="">なし</option>
          {yearGames.map((g) => (
            <option key={g.id} value={g.id}>
              {formatGameDate(g.game_date)} {g.opponent ?? ""}
            </option>
          ))}
        </select>
      </Field>

      <Field label="メモ(任意)" error={e.memo}>
        <input name="memo" defaultValue={v.memo} autoComplete="off" className={input} />
      </Field>

      <div className="flex gap-2">
        <Link href="/expenses" className="flex min-h-11 flex-1 items-center justify-center rounded-md border border-slate-300 bg-white">
          キャンセル
        </Link>
        <button type="submit" disabled={pending} className="min-h-11 flex-1 rounded-md bg-brand-600 font-bold text-white disabled:opacity-60">
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
