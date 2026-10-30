import type { Metadata } from "next";
import { connection } from "next/server";
import { getSeasons } from "@/lib/data/stats";
import { EXPORT_KINDS } from "@/lib/data/export";

export const metadata: Metadata = { title: "CSV書き出し" };

export default async function ExportPage() {
  await connection();
  const seasons = await getSeasons();

  const links = (Object.keys(EXPORT_KINDS) as (keyof typeof EXPORT_KINDS)[]).filter((k) => k !== "stats");
  return (
    <section className="space-y-5">
      <h1 className="text-xl font-bold">CSV書き出し</h1>
      <p className="text-sm text-slate-600">バックアップや表計算ソフトでの確認用です。Excel でそのまま開けます。</p>

      <div className="space-y-1">
        <h2 className="text-sm font-bold text-slate-600">{EXPORT_KINDS.stats}</h2>
        <div className="flex flex-wrap gap-2">
          {seasons.map((s) => (
            <a
              key={s}
              href={`/admin/export/stats?season=${s}`}
              download
              className="flex min-h-11 items-center rounded-md border border-slate-300 bg-white px-4"
            >
              {s}年
            </a>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <h2 className="text-sm font-bold text-slate-600">データ(バックアップ)</h2>
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
          {links.map((k) => (
            <li key={k}>
              <a href={`/admin/export/${k}`} download className="flex min-h-12 items-center justify-between px-4 hover:bg-slate-50">
                <span>{EXPORT_KINDS[k]}</span>
                <span className="text-sm text-brand-700">ダウンロード</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
