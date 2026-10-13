import Link from "next/link";

// 編集メニュー。未実装の画面はステップ7で追加する
const menu = [
  { label: "試合を追加", href: "/admin/games/new", step: null },
  { label: "試合一覧(編集・参加者登録・打撃入力)", href: "/games", step: null },
  { label: "選手管理(背番号)", href: "/admin/players", step: null },
  { label: "CSV書き出し", href: null, step: "ステップ7" },
];

export default function AdminPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-bold">編集メニュー</h1>
      <ul className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
        {menu.map((item) => (
          <li key={item.label}>
            {item.href ? (
              <Link href={item.href} className="flex min-h-12 items-center justify-between px-4 font-medium hover:bg-slate-50">
                <span>{item.label}</span>
                <span aria-hidden className="text-slate-400">
                  ›
                </span>
              </Link>
            ) : (
              <div className="flex min-h-12 items-center justify-between px-4 text-slate-400">
                <span>{item.label}</span>
                <span className="text-xs">{item.step}で追加</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
