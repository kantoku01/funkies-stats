import { describe, expect, test } from "vitest";
import { parsePlayerForm } from "./form";

const fd = (entries: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
};

describe("parsePlayerForm", () => {
  test("正規メンバー", () => {
    const r = parsePlayerForm(fd({ fullName: " 宮川　太郎 ", kind: "regular", joinedOn: "2026-01-01", number: "0" }));
    expect(r).toEqual({
      ok: true,
      values: { fullName: "宮川 太郎", kind: "regular", joinedOn: "2026-01-01", leftOn: "", number: "0" },
    });
  });

  test("全角数字の背番号は半角にする。\"00\" はそのまま", () => {
    expect(parsePlayerForm(fd({ fullName: "a", kind: "regular", joinedOn: "2026-01-01", number: "１１" })).values.number).toBe("11");
    expect(parsePlayerForm(fd({ fullName: "a", kind: "regular", joinedOn: "2026-01-01", number: "00" })).values.number).toBe("00");
  });

  test("助っ人は加入日・背番号なしでよく、背番号は捨てる", () => {
    const r = parsePlayerForm(fd({ fullName: "湯川", kind: "guest", number: "5" }));
    expect(r.ok).toBe(true);
    expect(r.values.number).toBe("");
  });

  test("必須・形式のエラー", () => {
    const r = parsePlayerForm(fd({ fullName: "", kind: "regular", joinedOn: "", number: "A1" }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors).sort()).toEqual(["fullName", "joinedOn", "number"]);
  });

  test("存在しない日付と、加入日より前の退団日", () => {
    const bad = parsePlayerForm(fd({ fullName: "a", kind: "regular", joinedOn: "2026-02-30" }));
    expect(bad.ok || bad.errors.joinedOn).toBe("日付の形式が正しくありません。");
    const early = parsePlayerForm(fd({ fullName: "a", kind: "regular", joinedOn: "2026-05-01", leftOn: "2026-04-30" }));
    expect(early.ok || early.errors.leftOn).toBe("退団日は加入日より後にしてください。");
  });

  test("4桁の背番号は不可", () => {
    const r = parsePlayerForm(fd({ fullName: "a", kind: "regular", joinedOn: "2026-01-01", number: "1000" }));
    expect(r.ok || r.errors.number).toBe("背番号は0〜3桁の数字で入力してください。");
  });

  test("マネージャーは加入日が必要で、背番号は任意", () => {
    const ok = parsePlayerForm(fd({ fullName: "まね子", kind: "manager", joinedOn: "2026-04-01", number: "" }));
    expect(ok.ok && ok.values.kind).toBe("manager");
    const withNumber = parsePlayerForm(fd({ fullName: "まね子", kind: "manager", joinedOn: "2026-04-01", number: "50" }));
    expect(withNumber.ok && withNumber.values.number).toBe("50");
    const noJoined = parsePlayerForm(fd({ fullName: "まね子", kind: "manager" }));
    expect(noJoined.ok || noJoined.errors.joinedOn).toBe("加入日を入力してください。");
  });

  test("区分の値が不正", () => {
    const r = parsePlayerForm(fd({ fullName: "a", kind: "admin", joinedOn: "2026-01-01" }));
    expect(r.ok || r.errors.kind).toBe("区分を選んでください。");
  });
});
