// 編集メニュー。各画面はステップ4〜7で追加する
const menu = [
  { label: "試合の追加・編集", step: "ステップ5" },
  { label: "参加者登録", step: "ステップ5" },
  { label: "打撃入力", step: "ステップ6" },
  { label: "選手管理(背番号)", step: "ステップ4" },
  { label: "CSV書き出し", step: "ステップ7" },
];

export default function AdminPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-bold">編集メニュー</h1>
      <ul className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
        {menu.map((item) => (
          <li key={item.label} className="flex min-h-11 items-center justify-between px-4 text-slate-400">
            <span>{item.label}</span>
            <span className="text-xs">{item.step}で追加</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
