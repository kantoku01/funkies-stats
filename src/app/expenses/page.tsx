import type { Metadata } from "next";

export const metadata: Metadata = { title: "チーム経費" };

// 仮のページ。チーム経費は次の段階で作る
export default function ExpensesPage() {
  return (
    <section className="space-y-2">
      <h1 className="text-xl font-bold">チーム経費</h1>
      <p className="text-slate-600">準備中です。</p>
    </section>
  );
}
