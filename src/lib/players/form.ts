import type { CarpoolGroup, PlayerKind } from "@/types/database";

// 選手フォームの入力値(画面に戻すときもこの形)
export type PlayerFormValues = {
  fullName: string;
  kind: PlayerKind;
  joinedOn: string;
  leftOn: string;
  number: string;
  carpoolGroup: CarpoolGroup | ""; // 配車(未設定は空)
};

export type PlayerFormErrors = Partial<Record<keyof PlayerFormValues, string>>;

export type ParsedPlayerForm =
  | { ok: true; values: PlayerFormValues }
  | { ok: false; values: PlayerFormValues; errors: PlayerFormErrors };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(s: string): boolean {
  if (!DATE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

const str = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

export function parsePlayerForm(formData: FormData): ParsedPlayerForm {
  const kindRaw = str(formData, "kind");
  const values: PlayerFormValues = {
    // 全角スペースは半角にそろえる(「森 陽」と「森 陽」を同じにする)
    fullName: str(formData, "fullName").replace(/[\s　]+/g, " "),
    kind: kindRaw === "guest" || kindRaw === "manager" ? kindRaw : "regular",
    joinedOn: str(formData, "joinedOn"),
    leftOn: str(formData, "leftOn"),
    number: str(formData, "number").replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)),
    carpoolGroup: (["A", "B", "individual"] as const).find((g) => g === str(formData, "carpoolGroup")) ?? "",
  };
  const errors: PlayerFormErrors = {};

  if (!values.fullName) errors.fullName = "氏名を入力してください。";
  else if (values.fullName.length > 40) errors.fullName = "氏名は40文字以内で入力してください。";

  if (kindRaw !== "regular" && kindRaw !== "guest" && kindRaw !== "manager") errors.kind = "区分を選んでください。";

  // 正規メンバーとマネージャーは加入日が必要(在籍期間で年会費や試合数を数えるため)
  if (values.kind !== "guest") {
    if (!values.joinedOn) errors.joinedOn = "加入日を入力してください。";
    else if (!isValidDate(values.joinedOn)) errors.joinedOn = "日付の形式が正しくありません。";
  } else if (values.joinedOn && !isValidDate(values.joinedOn)) {
    errors.joinedOn = "日付の形式が正しくありません。";
  }

  if (values.leftOn) {
    if (!isValidDate(values.leftOn)) errors.leftOn = "日付の形式が正しくありません。";
    else if (values.joinedOn && !errors.joinedOn && values.leftOn < values.joinedOn)
      errors.leftOn = "退団日は加入日より後にしてください。";
  }

  if (values.kind === "guest") values.carpoolGroup = ""; // 配車は選手とマネージャー(助っ人はなし)
  if (values.kind === "guest") values.number = ""; // 助っ人は背番号なし(「助」と表示)
  else if (values.number && !/^[0-9]{1,3}$/.test(values.number))
    errors.number = "背番号は0〜3桁の数字で入力してください。";

  return Object.keys(errors).length === 0 ? { ok: true, values } : { ok: false, values, errors };
}
