"use client";

import { useActionState } from "react";
import { removeExtraDate, saveScheduleDate, type ScheduleEditState } from "../actions";
import { EventForm } from "./event-editor";

// 編集者向け: その日の予定(活動予定 / 休み / 未定)とメモ。試合の予定にする / 試合を足す
export function DayEditor({
  day,
  kind,
  note,
  extra,
  hasGame,
}: {
  day: string;
  kind: string;
  note: string | null;
  extra: boolean;
  hasGame: boolean;
}) {
  const [state, action, pending] = useActionState<ScheduleEditState, FormData>(saveScheduleDate, { message: null });
  const [removeState, removeAction, removing] = useActionState<ScheduleEditState, FormData>(removeExtraDate, { message: null });
  // 活動予定は相手が決まっていない試合なので、相手が決まったらそのまま試合の予定にできる(メモの時間・場所を引き継ぐ)
  const toGame = !hasGame && kind === "practice";
  return (
    <div className="flex items-start gap-2 text-sm">
      <details className="min-w-0 flex-1">
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
        {/* 練習・試合とは別に出欠を取る予定(忘年会など) */}
        <div className="mt-3 space-y-1 border-t border-slate-100 pt-2">
          <p className="font-medium text-slate-600">別の予定を足す(忘年会など、出欠を別に集計)</p>
          <EventForm day={day} submitLabel="別の予定を足す" />
        </div>
      </details>
      <a
        href={toGame ? `/admin/games/new?date=${day}&from=schedule` : `/admin/games/new?date=${day}`}
        className={`shrink-0 ${toGame ? "rounded-md border border-brand-600 px-2 py-1 font-bold text-brand-700" : "text-brand-700"}`}
      >
        {toGame ? "試合の予定にする" : "＋ 試合を追加"}
      </a>
    </div>
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
