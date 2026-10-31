"use client";

import { useState, useTransition } from "react";
import { sendGameMessage } from "./line-actions";

type Props = {
  initial: string;
  gameId: string;
  groupReady: boolean; // 公式アカウントがグループに入っているか
  sentAt: string | null; // グループに送った日時
  auto: boolean; // 自動で送ったか
};

const sentLabel = (iso: string) =>
  new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );

// 試合前日の連絡: 自動で作った文面を手で直してから、グループに送る / LINE で送る / コピーする。
// グループに送らなければ、前日18時にそのときの文面で自動で送る
export function LineMessageForm({ initial, gameId, groupReady, sentAt: sentAtInitial, auto }: Props) {
  const [text, setText] = useState(initial);
  const [copied, setCopied] = useState(false);
  const [sentAt, setSentAt] = useState(sentAtInitial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const sendToGroup = () => {
    if (!window.confirm(sentAt ? "もう一度グループに送ります。よろしいですか?" : "この文面をチームのグループに送ります。よろしいですか?")) return;
    setError(null);
    startTransition(async () => {
      const r = await sendGameMessage(gameId, text);
      if (r.ok) setSentAt(r.sentAt);
      else setError(r.error);
    });
  };

  return (
    <div className="space-y-2 rounded-md border-2 border-[#06C755] bg-white p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-bold">LINEで連絡する</h2>
        {text !== initial && (
          <button type="button" onClick={() => setText(initial)} className="text-sm text-brand-700">
            最初の文面に戻す
          </button>
        )}
      </div>
      <p className="text-xs text-slate-500">
        ○と△の人(選手・マネージャー)で作っています。送る前に直せます(直した文面は保存されません)。
        {groupReady && !sentAt && " グループに送らなければ、前日18時ごろにそのときの文面で自動で送ります。"}
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={16}
        className="block w-full rounded-md border border-slate-300 p-3 text-base leading-relaxed"
      />
      {groupReady && (
        <button
          type="button"
          onClick={sendToGroup}
          disabled={pending}
          className="min-h-12 w-full rounded-md bg-[#06C755] font-bold text-white disabled:opacity-60"
        >
          {pending ? "送信中…" : sentAt ? "グループにもう一度送る" : "チームのグループに送る"}
        </button>
      )}
      {sentAt && (
        <p role="status" className="text-sm text-emerald-700">
          {sentLabel(sentAt)} にグループに送りました{auto && sentAt === sentAtInitial ? "(自動)" : ""}。
        </p>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <a
          href={`https://line.me/R/msg/text/?${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex min-h-11 items-center justify-center rounded-md text-sm font-bold ${
            groupReady ? "border border-[#06C755] text-[#06A847]" : "bg-[#06C755] text-white"
          }`}
        >
          LINEで送る
        </a>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              window.prompt("この文面をコピーしてください", text);
            }
          }}
          className="min-h-11 rounded-md border border-slate-300 bg-white text-sm"
        >
          {copied ? "コピーしました" : "文面をコピー"}
        </button>
      </div>
    </div>
  );
}
