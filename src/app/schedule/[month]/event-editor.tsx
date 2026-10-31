"use client";

import { useActionState } from "react";
import { removeScheduleEvent, saveScheduleEvent, type ScheduleEditState } from "../actions";

type EventValues = { id?: string; title: string; startTime: string; place: string; note: string };

// 編集者向け: 別の予定(忘年会など)を足す・直す。id があれば直す
export function EventForm({ day, initial, submitLabel }: { day: string; initial?: EventValues; submitLabel: string }) {
  const [state, action, pending] = useActionState<ScheduleEditState, FormData>(saveScheduleEvent, { message: null });
  const v = initial ?? { title: "", startTime: "", place: "", note: "" };
  return (
    <form action={action} className="space-y-2 text-sm">
      <input type="hidden" name="day" value={day} />
      {v.id && <input type="hidden" name="id" value={v.id} />}
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input name="title" defaultValue={v.title} maxLength={30} required placeholder="名前(例: 忘年会)" className="block min-h-10 w-full rounded-md border border-slate-300 px-3" />
        <input name="startTime" defaultValue={v.startTime} type="time" className="block min-h-10 rounded-md border border-slate-300 px-2" />
      </div>
      <input name="place" defaultValue={v.place} maxLength={60} placeholder="場所(例: といとい スカイカップコース)" className="block min-h-10 w-full rounded-md border border-slate-300 px-3" />
      <textarea
        name="note"
        defaultValue={v.note}
        maxLength={200}
        rows={2}
        placeholder="備考(例: 会費5,000円、地図の URL など)"
        className="block w-full rounded-md border border-slate-300 px-3 py-2"
      />
      <button type="submit" disabled={pending} className="min-h-10 w-full rounded-md border border-brand-600 font-bold text-brand-700 disabled:opacity-60">
        {pending ? "保存中…" : submitLabel}
      </button>
      {state.message && <p className="text-red-700">{state.message}</p>}
    </form>
  );
}

// 編集者向け: 別の予定を直す・消す
export function EventEditor({ day, event }: { day: string; event: Required<EventValues> }) {
  const [state, action, pending] = useActionState<ScheduleEditState, FormData>(removeScheduleEvent, { message: null });
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-brand-700">この予定を編集</summary>
      <div className="mt-2 space-y-2">
        <EventForm day={day} initial={event} submitLabel="保存" />
        <form
          action={action}
          onSubmit={(e) => {
            if (!window.confirm(`「${event.title}」を消します。回答も消えます。よろしいですか?`)) e.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={event.id} />
          <button type="submit" disabled={pending} className="min-h-10 w-full rounded-md border border-red-300 text-red-700">
            この予定を消す
          </button>
          {state.message && <p className="text-red-700">{state.message}</p>}
        </form>
      </div>
    </details>
  );
}
