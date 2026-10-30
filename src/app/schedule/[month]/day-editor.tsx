"use client";

import { useActionState } from "react";
import { removeExtraDate, saveScheduleDate, type ScheduleEditState } from "../actions";

// 編集者向け: その日の予定(活動予定 / 休み / 未定)とメモ
export function DayEditor({ day, kind, note, extra }: { day: string; kind: string; note: string | null; extra: boolean }) {
  const [state, action, pending] = useActionState<ScheduleEditState, FormData>(saveScheduleDate, { message: null });
  const [removeState, removeAction, removing] = useActionState<ScheduleEditState, FormData>(removeExtraDate, { message: null });
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-brand-700">予定を編集</summary>
      <form action={action} className="mt-2 space-y-2">
        <input type="hidden" name="day" value={day} />
        <input type="hidden" name="extra" value={extra ? "1" : "0"} />
        <div className="grid grid-cols-3 gap-1">
          {(
            [
              ["practice", "活動予定"],
              ["off", "休み"],
              ["tbd", "未定"],
            ] as const
          ).map(([v, label]) => (
            <label
              key={v}
              className="flex min-h-10 items-center justify-center rounded-md border border-slate-300 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-600 has-[:checked]:text-white"
            >
              <input type="radio" name="kind" value={v} defaultChecked={kind === v} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
        <input name="note" defaultValue={note ?? ""} maxLength={100} placeholder="メモ(場所・時間など)" className="block min-h-10 w-full rounded-md border border-slate-300 px-3" />
        <div className="flex gap-2">
          <button type="submit" disabled={pending} className="min-h-10 flex-1 rounded-md bg-brand-600 font-bold text-white disabled:opacity-60">
            {pending ? "保存中…" : "保存"}
          </button>
          <a href={`/admin/games/new?date=${day}`} className="flex min-h-10 flex-1 items-center justify-center rounded-md border border-brand-600 text-brand-700">
            試合予定を作る
          </a>
        </div>
        {state.message && <p className="text-red-700">{state.message}</p>}
      </form>
      {extra && (
        <form
          action={removeAction}
          onSubmit={(e) => {
            if (!window.confirm("この日付を外します。この日の回答も消えます。よろしいですか?")) e.preventDefault();
          }}
          className="mt-2"
        >
          <input type="hidden" name="day" value={day} />
          <button type="submit" disabled={removing} className="min-h-10 w-full rounded-md border border-red-300 text-red-700">
            この日付を外す
          </button>
          {removeState.message && <p className="text-red-700">{removeState.message}</p>}
        </form>
      )}
    </details>
  );
}

// 編集者向け: 日曜以外の日付を足す
export function AddDateForm({ first, last }: { first: string; last: string }) {
  const [state, action, pending] = useActionState<ScheduleEditState, FormData>(saveScheduleDate, { message: null });
  return (
    <form action={action} className="flex items-end gap-2 text-sm">
      <input type="hidden" name="extra" value="1" />
      <input type="hidden" name="kind" value="tbd" />
      <label className="flex-1 space-y-1">
        <span className="text-slate-600">日曜以外の日付を足す(祝日など)</span>
        <input type="date" name="day" min={first} max={last} required className="block min-h-10 w-full rounded-md border border-slate-300 px-2" />
      </label>
      <button type="submit" disabled={pending} className="min-h-10 rounded-md border border-brand-600 px-3 font-bold text-brand-700">
        足す
      </button>
      {state.message && <p className="text-red-700">{state.message}</p>}
    </form>
  );
}
