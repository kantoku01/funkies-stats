import { categoriesOf, type LedgerCategory, type LedgerKind } from "./categories";

export type LedgerFormValues = {
  entryDate: string;
  kind: LedgerKind;
  category: LedgerCategory | "";
  amount: string;
  payer: "club" | "advance"; // 支出の払い方: 部費から直接 / 立て替え
  playerId: string; // 年会費の納入者 / 立て替えた人
  settled: boolean;
  settledOn: string;
  gameId: string;
  memo: string;
};

export type LedgerFormErrors = Partial<Record<keyof LedgerFormValues, string>>;

export type LedgerRecord = {
  entry_date: string;
  kind: LedgerKind;
  category: LedgerCategory;
  amount: number;
  memo: string | null;
  player_id: string | null;
  settled_on: string | null;
  game_id: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

const toHalfWidth = (s: string) =>
  s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/[,，円¥\s]/g, "");

export function parseLedgerForm(
  formData: FormData,
): { ok: true; values: LedgerFormValues; record: LedgerRecord } | { ok: false; values: LedgerFormValues; errors: LedgerFormErrors } {
  const str = (k: string) => String(formData.get(k) ?? "").trim();
  const kind: LedgerKind = str("kind") === "income" ? "income" : "expense";
  const category = str("category") as LedgerCategory;
  const values: LedgerFormValues = {
    entryDate: str("entryDate"),
    kind,
    category: categoriesOf(kind).includes(category) ? category : "",
    amount: toHalfWidth(str("amount")),
    payer: str("payer") === "advance" ? "advance" : "club",
    playerId: str("playerId"),
    settled: str("settled") === "on",
    settledOn: str("settledOn"),
    gameId: str("gameId"),
    memo: str("memo"),
  };
  const errors: LedgerFormErrors = {};

  if (!isValidDate(values.entryDate)) errors.entryDate = "日付を入力してください。";
  if (!values.category) errors.category = "項目を選んでください。";
  const amount = Number(values.amount);
  if (!/^\d{1,8}$/.test(values.amount) || amount < 1 || amount > 10_000_000) errors.amount = "金額を1〜10,000,000円で入力してください。";
  if (values.memo.length > 200) errors.memo = "メモは200文字以内で入力してください。";
  if (values.gameId && !UUID.test(values.gameId)) errors.gameId = "試合が正しくありません。";

  // 誰のお金か: 年会費は納入者が必要、立て替えは立て替えた人が必要。それ以外は持たない
  const needsPlayer = (kind === "income" && values.category === "dues") || (kind === "expense" && values.payer === "advance");
  if (needsPlayer && !UUID.test(values.playerId)) {
    errors.playerId = kind === "income" ? "納入した選手を選んでください。" : "立て替えた人を選んでください。";
  }
  const settledOn = kind === "expense" && values.payer === "advance" && values.settled ? values.settledOn : "";
  if (kind === "expense" && values.payer === "advance" && values.settled && !isValidDate(values.settledOn)) {
    errors.settledOn = "精算した日を入力してください。";
  }

  if (Object.keys(errors).length > 0) return { ok: false, values, errors };
  return {
    ok: true,
    values,
    record: {
      entry_date: values.entryDate,
      kind,
      category: values.category as LedgerCategory,
      amount,
      memo: values.memo || null,
      player_id: needsPlayer ? values.playerId : null,
      settled_on: settledOn || null,
      game_id: values.gameId || null,
    },
  };
}
