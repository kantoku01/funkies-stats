"use client";

import { useState } from "react";

// LINE で送る(今日以降の予定をまとめた文面) / URL をコピー
export function ShareButtons({ message }: { message: string }) {
  const [copied, setCopied] = useState(false);
  const lineHref = `https://line.me/R/msg/text/?${encodeURIComponent(message)}`;

  return (
    <div className="grid grid-cols-2 gap-2">
      <a
        href={lineHref}
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
            await navigator.clipboard.writeText(window.location.href.split("#")[0]);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            window.prompt("このURLをコピーしてください", window.location.href.split("#")[0]);
          }
        }}
        className="min-h-11 rounded-md border border-slate-300 bg-white text-sm"
      >
        {copied ? "コピーしました" : "URLをコピー"}
      </button>
    </div>
  );
}
