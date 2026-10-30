"use client";

import { useEffect } from "react";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="space-y-3">
      <h1 className="text-xl font-bold">読み込みに失敗しました</h1>
      <p className="text-slate-600">通信状況を確認して、もう一度お試しください。</p>
      <button type="button" onClick={() => retry()} className="min-h-11 rounded-md bg-brand-600 px-4 font-bold text-white">
        再読み込み
      </button>
    </section>
  );
}
