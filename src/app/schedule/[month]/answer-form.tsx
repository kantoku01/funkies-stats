"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ANSWER_MARK, type Answer } from "@/lib/schedule/month";
import { saveAnswers } from "../actions";

type Props = {
  members: { id: string; name: string; number: string }[];
  days: { day: string; label: string; event: string }[];
  // player_id → day → 回答
  current: Record<string, Record<string, { answer: Answer; comment: string | null }>>;
};

const STORAGE_KEY = "funkies.schedule.player";
const BUTTON: Record<Answer, string> = {
  yes: "has-[:checked]:bg-red-600 has-[:checked]:border-red-600",
  maybe: "has-[:checked]:bg-amber-500 has-[:checked]:border-amber-500",
  no: "has-[:checked]:bg-slate-500 has-[:checked]:border-slate-500",
};

export function AnswerForm({ members, days, current }: Props) {
  const router = useRouter();
  const [playerId, setPlayerId] = useState("");
  const [draft, setDraft] = useState<Record<string, { answer: Answer | null; comment: string }>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  // 前回選んだ名前を覚えておく(この端末だけ)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && members.some((m) => m.id === saved)) choose(saved);
    } catch {
      // 保存できない環境では毎回選ぶ
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choose(id: string) {
    setPlayerId(id);
    setMessage(null);
    const mine = current[id] ?? {};
    setDraft(Object.fromEntries(days.map((d) => [d.day, { answer: mine[d.day]?.answer ?? null, comment: mine[d.day]?.comment ?? "" }])));
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id);
    } catch {}
  }

  const save = () => {
    const mine = current[playerId] ?? {};
    // 変わった日だけ送る
    const changed = days
      .map((d) => ({ day: d.day, answer: draft[d.day]?.answer ?? null, comment: draft[d.day]?.comment ?? "" }))
      .filter((a) => a.answer !== (mine[a.day]?.answer ?? null) || a.comment !== (mine[a.day]?.comment ?? ""));
    if (changed.length === 0) {
      setMessage({ ok: true, text: "変更はありません。" });
      return;
    }
    startTransition(async () => {
      const r = await saveAnswers(playerId, changed);
      setMessage(r.ok ? { ok: true, text: "回答を保存しました。" } : { ok: false, text: r.error });
      if (r.ok) router.refresh();
    });
  };

  return (
    <div className="space-y-3 rounded-lg border-2 border-brand-600 bg-white p-3">
      <h2 className="font-bold">出欠を回答する</h2>
      <label className="block space-y-1">
        <span className="text-sm font-medium">名前</span>
        <select
          value={playerId}
          onChange={(e) => choose(e.target.value)}
          className="block min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base"
        >
          <option value="">選んでください</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.number ? `${m.number} ` : ""}
              {m.name}
            </option>
          ))}
        </select>
      </label>

      {playerId && (
        <>
          <ul className="divide-y divide-slate-100">
            {days.map((d) => {
              const v = draft[d.day] ?? { answer: null, comment: "" };
              return (
                <li key={d.day} className="space-y-1.5 py-2">
                  {/* 予定の内容も日付と同じ字体で、日付の下の行に */}
                  <p className="font-bold">
                    <span className="block tabular-nums">{d.label}</span>
                    {d.event && <span className="block">{d.event}</span>}
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["yes", "maybe", "no"] as const).map((a) => (
                      <label
                        key={a}
                        className={`flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white text-xl font-bold has-[:checked]:text-white ${BUTTON[a]}`}
                      >
                        <input
                          type="radio"
                          name={`answer-${d.day}`}
                          checked={v.answer === a}
                          onChange={() => setDraft((p) => ({ ...p, [d.day]: { ...v, answer: a } }))}
                          // もう一度押すと取り消し
                          onClick={() => v.answer === a && setDraft((p) => ({ ...p, [d.day]: { ...v, answer: null } }))}
                          className="sr-only"
                        />
                        {ANSWER_MARK[a]}
                      </label>
                    ))}
                  </div>
                  <input
                    value={v.comment}
                    onChange={(e) => setDraft((p) => ({ ...p, [d.day]: { ...v, comment: e.target.value } }))}
                    maxLength={100}
                    placeholder="コメント(任意)"
                    className="block min-h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                  />
                </li>
              );
            })}
          </ul>
          {message && (
            <p role="status" className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-700"}`}>
              {message.text}
            </p>
          )}
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="min-h-12 w-full rounded-md bg-brand-600 text-lg font-bold text-white disabled:opacity-60"
          >
            {pending ? "保存中…" : "回答を保存"}
          </button>
        </>
      )}
    </div>
  );
}
