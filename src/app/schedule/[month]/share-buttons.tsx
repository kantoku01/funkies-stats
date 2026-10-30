"use client";

import { useState } from "react";

// LINE で送る / URL をコピー
export function ShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window === "undefined" ? "" : window.location.href.split("#")[0];
  const lineHref = `https://line.me/R/msg/text/?${encodeURIComponent(`${title}\n${url}`)}`;

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
