"use client";

import { useState } from "react";

// 試合前日の連絡: 自動で作った文面を手で直してから LINE で送る / コピーする
export function LineMessageForm({ initial }: { initial: string }) {
  const [text, setText] = useState(initial);
  const [copied, setCopied] = useState(false);

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
      <p className="text-xs text-slate-500">○と△の人(選手・マネージャー)で作っています。送る前に直せます(直した文面は保存されません)。</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={16}
        className="block w-full rounded-md border border-slate-300 p-3 text-base leading-relaxed"
      />
      <div className="grid grid-cols-2 gap-2">
        <a
          href={`https://line.me/R/msg/text/?${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 items-center justify-center rounded-md bg-[#06C755] text-sm font-bold text-white"
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
