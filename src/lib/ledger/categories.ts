export type LedgerKind = "income" | "expense";

export const INCOME_CATEGORIES = { dues: "年会費", carryover: "繰越金", other_income: "その他収入" } as const;
export const EXPENSE_CATEGORIES = {
  ground: "グラウンド代",
  umpire: "審判代",
  equipment: "ボール・用具",
  tournament: "大会参加費",
  social: "懇親会",
  other_expense: "その他",
} as const;

export type IncomeCategory = keyof typeof INCOME_CATEGORIES;
export type ExpenseCategory = keyof typeof EXPENSE_CATEGORIES;
export type LedgerCategory = IncomeCategory | ExpenseCategory;

export const CATEGORY_LABEL: Record<LedgerCategory, string> = { ...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES };

export function categoriesOf(kind: LedgerKind): LedgerCategory[] {
  return Object.keys(kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES) as LedgerCategory[];
}

export function formatYen(n: number): string {
  return `${n < 0 ? "−" : ""}${Math.abs(n).toLocaleString("ja-JP")}円`;
}
