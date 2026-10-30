import { RESULT_KIND, RESULT_LABEL, RESULT_SHORT, type BattingEntry } from "@/lib/batting/entry";

const CHIP: Record<"hit" | "walk" | "out", string> = {
  hit: "bg-brand-600 text-white",
  walk: "bg-emerald-100 text-emerald-900",
  out: "bg-slate-100 text-slate-500",
};

// 打席結果を「単 本 凡」のような小さな札で並べる
export function PaChip({ entry }: { entry: BattingEntry }) {
  return (
    <span
      title={`${RESULT_LABEL[entry.result]}${entry.rbi ? ` ${entry.rbi}打点` : ""}`}
      className={`inline-flex h-7 min-w-7 items-center justify-center whitespace-nowrap rounded px-1 text-xs font-bold ${CHIP[RESULT_KIND[entry.result]]}`}
    >
      {RESULT_SHORT[entry.result]}
      {entry.rbi > 0 && <sup className="ml-px text-[9px]">{entry.rbi}</sup>}
    </span>
  );
}
