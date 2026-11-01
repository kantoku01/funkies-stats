import { formatYen } from "@/lib/ledger/categories";

// 試合の当日のお金。相手チームから受け取るお金は、支払いの「うち相手チームから」として合算する

export type CostItem = "ground" | "umpire" | "ground_umpire" | "opponent" | "other";
export type CostPayer = "undecided" | "club" | "player";

export const COST_ITEM_LABEL: Record<CostItem, string> = {
  ground: "グラウンド代",
  umpire: "審判代",
  ground_umpire: "グラウンド代＋審判代",
  opponent: "相手チームへ",
  other: "その他", // 前に入れた分の表示用。新しくは選ばせない
};
export const COST_ITEM_CHOICES: CostItem[] = ["ground", "umpire", "ground_umpire", "opponent"];

export type GameCost = {
  id: string;
  item: CostItem;
  amount: number;
  opponent_share: number;
  payer: CostPayer;
  player_id: string | null;
  memo: string | null;
  ledger_entry_id: string | null;
};

// こちらの負担(経費に記録する額)
export const ourShare = (c: Pick<GameCost, "amount" | "opponent_share">) => c.amount - c.opponent_share;

// 経費の種類: グラウンド代・審判代はまとめて「グラウンド・審判代」
export function costLedgerCategory(item: CostItem): "ground" | "opponent" | "other_expense" {
  return item === "opponent" ? "opponent" : item === "other" ? "other_expense" : "ground";
}

// 「審判代 7,000円(うち相手チームから 5,000円)」
export function costText(c: Pick<GameCost, "item" | "amount" | "opponent_share" | "memo">): string {
  const share = c.opponent_share > 0 ? `(うち相手チームから ${formatYen(c.opponent_share)})` : "";
  return `${COST_ITEM_LABEL[c.item]} ${formatYen(c.amount)}${share}${c.memo ? ` ${c.memo}` : ""}`;
}

// 「支払い: 未定 / 部費から / 安達さん立て替え」
export function payerText(c: Pick<GameCost, "payer">, playerName: string | null): string {
  if (c.payer === "club") return "部費から";
  if (c.payer === "player") return `${playerName ?? "選手"}さん立て替え`;
  return "支払い未定";
}

// 前日の LINE に載せる行(なければ空)
export function costLines(costs: GameCost[], nameOf: (id: string) => string | null): string[] {
  if (costs.length === 0) return [];
  const total = costs.reduce((s, c) => s + ourShare(c), 0);
  return [
    ...costs.map((c) => `${costText(c)} / ${payerText(c, c.player_id ? nameOf(c.player_id) : null)}`),
    `こちらの負担 合計 ${formatYen(total)}`,
  ];
}

export type CostFormValues = { item: CostItem; amount: number; opponentShare: number; payer: CostPayer; playerId: string | null; memo: string | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const toInt = (s: string) => Number(s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/[,，円\s]/g, ""));

export function parseCostForm(formData: FormData): { ok: true; values: CostFormValues } | { ok: false; error: string } {
  const str = (k: string) => String(formData.get(k) ?? "").trim();
  const item = str("item") as CostItem;
  if (!COST_ITEM_CHOICES.includes(item) && item !== "other") return { ok: false, error: "項目を選んでください。" };
  const amount = toInt(str("amount"));
  if (!Number.isInteger(amount) || amount < 1 || amount > 10_000_000) return { ok: false, error: "金額を数字で入れてください。" };
  const shareRaw = str("opponentShare");
  const opponentShare = item === "opponent" || shareRaw === "" ? 0 : toInt(shareRaw);
  if (!Number.isInteger(opponentShare) || opponentShare < 0 || opponentShare > amount) {
    return { ok: false, error: "相手チームからの額は、0円から総額までで入れてください。" };
  }
  const payerRaw = str("payer");
  let payer: CostPayer = "undecided";
  let playerId: string | null = null;
  if (payerRaw === "club") payer = "club";
  else if (UUID.test(payerRaw)) {
    payer = "player";
    playerId = payerRaw;
  }
  const memo = str("memo");
  if (memo.length > 100) return { ok: false, error: "メモは100文字以内で入れてください。" };
  return { ok: true, values: { item, amount, opponentShare, payer, playerId, memo: memo || null } };
}

// 試合予定の入力画面でまとめて入れた当日のお金(JSON)を読む。空の行は飛ばす
export function parseCostRows(json: string): { ok: true; values: CostFormValues[] } | { ok: false; error: string } {
  let rows: unknown;
  try {
    rows = JSON.parse(json || "[]");
  } catch {
    return { ok: false, error: "当日のお金の内容が正しくありません。" };
  }
  if (!Array.isArray(rows) || rows.length > 10) return { ok: false, error: "当日のお金は10件までです。" };
  const values: CostFormValues[] = [];
  for (const [i, row] of rows.entries()) {
    const r = (row ?? {}) as Record<string, unknown>;
    if (String(r.amount ?? "").trim() === "") continue;
    const f = new FormData();
    for (const k of ["item", "amount", "opponentShare", "payer", "memo"]) f.set(k, String(r[k] ?? ""));
    const parsed = parseCostForm(f);
    if (!parsed.ok) return { ok: false, error: `当日のお金 ${i + 1}行目: ${parsed.error}` };
    values.push(parsed.values);
  }
  return { ok: true, values };
}
