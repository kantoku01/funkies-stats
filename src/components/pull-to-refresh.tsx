"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

const THRESHOLD = 60; // これだけ引っ張って離したら更新
const MAX = 90;

// 画面のいちばん上で下に引っ張って離すと、表示を新しくする。
// ホーム画面に追加したアプリ(standalone)はブラウザの引っ張って更新が効かないので、そのときだけ動かす
export function PullToRefresh() {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!standalone) return;

    let startY: number | null = null;
    let distance = 0;
    const onStart = (e: TouchEvent) => {
      startY = window.scrollY <= 0 && e.touches.length === 1 ? e.touches[0].clientY : null;
      distance = 0;
    };
    const onMove = (e: TouchEvent) => {
      if (startY === null) return;
      if (window.scrollY > 0) {
        startY = null;
        setPull(0);
        return;
      }
      distance = Math.min(Math.max(0, (e.touches[0].clientY - startY) * 0.5), MAX);
      setPull(distance);
    };
    const onEnd = () => {
      if (startY !== null && distance >= THRESHOLD) startTransition(() => router.refresh());
      startY = null;
      distance = 0;
      setPull(0);
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [router]);

  if (pull === 0 && !pending) return null;
  const ready = pull >= THRESHOLD;
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center"
      style={{ transform: `translateY(${pending ? 56 : pull}px)` }}
    >
      <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-brand-700 shadow-md">
        <span
          aria-hidden
          className={`inline-block size-4 rounded-full border-2 border-brand-600 border-t-transparent ${pending ? "animate-spin" : ""}`}
          style={pending ? undefined : { transform: `rotate(${pull * 4}deg)` }}
        />
        {pending ? "更新中…" : ready ? "離すと更新" : "引っ張って更新"}
      </div>
    </div>
  );
}
