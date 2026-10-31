"use server";

import { revalidatePath } from "next/cache";
import { getCurrentEditor } from "@/lib/auth";
import { temporaryPassword } from "@/lib/editors/password";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type EditorActionState = { message: string | null; ok?: boolean; password?: string; email?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function guard(): Promise<string | null> {
  if (!(await getCurrentEditor())) return "編集者としてログインしてください。";
  if (!adminConfigured()) return "Vercel に SUPABASE_SECRET_KEY が登録されていません。";
  return null;
}

// メールアドレスからログイン用のユーザーを探す(人数が少ないので一覧から探す)
async function findUserId(email: string): Promise<string | null> {
  const admin = createAdminClient();
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

// 編集者を追加する。ログイン用のユーザーを作り(いれば仮のパスワードを出し直し)、編集者に登録する
export async function addEditor(_prev: EditorActionState, formData: FormData): Promise<EditorActionState> {
  const denied = await guard();
  if (denied) return { message: denied };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (!EMAIL.test(email)) return { message: "メールアドレスを正しく入れてください。" };
  if (!displayName || displayName.length > 20) return { message: "名前を20文字以内で入れてください。" };

  const admin = createAdminClient();
  const password = temporaryPassword();
  let userId = await findUserId(email);
  if (userId) {
    const { error } = await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
    if (error) return { message: `パスワードを設定できませんでした(${error.message})。` };
  } else {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) return { message: `ユーザーを作れませんでした(${error?.message ?? "不明"})。` };
    userId = data.user.id;
  }
  const { error } = await admin.from("editors").upsert({ user_id: userId, display_name: displayName }, { onConflict: "user_id" });
  if (error) return { message: `編集者に登録できませんでした(${error.message})。` };

  revalidatePath("/admin/editors");
  return { message: null, ok: true, email, password };
}

// 仮のパスワードを出し直す(パスワードを忘れた人向け)
export async function resetEditorPassword(_prev: EditorActionState, formData: FormData): Promise<EditorActionState> {
  const denied = await guard();
  if (denied) return { message: denied };
  const userId = String(formData.get("userId") ?? "");
  const email = String(formData.get("email") ?? "");
  if (!UUID.test(userId)) return { message: "編集者が見つかりません。" };
  const password = temporaryPassword();
  const { error } = await createAdminClient().auth.admin.updateUserById(userId, { password });
  if (error) return { message: `パスワードを設定できませんでした(${error.message})。` };
  return { message: null, ok: true, email, password };
}

// 編集者から外して、ログインもできなくする(自分は外せない)
export async function removeEditor(_prev: EditorActionState, formData: FormData): Promise<EditorActionState> {
  const denied = await guard();
  if (denied) return { message: denied };
  const userId = String(formData.get("userId") ?? "");
  if (!UUID.test(userId)) return { message: "編集者が見つかりません。" };
  if ((await getCurrentEditor())?.userId === userId) return { message: "自分自身は外せません。" };

  const admin = createAdminClient();
  const { error } = await admin.from("editors").delete().eq("user_id", userId);
  if (error) return { message: `外せませんでした(${error.message})。` };
  await admin.auth.admin.deleteUser(userId);
  revalidatePath("/admin/editors");
  return { message: null, ok: true };
}

// 自分のパスワードを変える
export async function changeOwnPassword(_prev: EditorActionState, formData: FormData): Promise<EditorActionState> {
  if (!(await getCurrentEditor())) return { message: "編集者としてログインしてください。" };
  const password = String(formData.get("password") ?? "");
  if (password.length < 8 || password.length > 72) return { message: "パスワードは8文字以上にしてください。" };
  if (password !== String(formData.get("confirm") ?? "")) return { message: "確認用のパスワードが一致しません。" };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { message: `変更できませんでした(${error.message})。` };
  return { message: "パスワードを変更しました。", ok: true };
}
