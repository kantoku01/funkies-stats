import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Editor = {
  userId: string;
  displayName: string;
};

// ログイン中の編集者を返す。未ログイン、または editors に登録されていなければ null
export async function getCurrentEditor(): Promise<Editor | null> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return null;

  // RLS により本人の行しか返らない
  const { data: editor } = await supabase
    .from("editors")
    .select("user_id, display_name")
    .eq("user_id", userId)
    .maybeSingle();
  if (!editor) return null;

  return { userId: editor.user_id, displayName: editor.display_name };
}

// ログインしているか(編集者でなくても true)
export async function isLoggedIn(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return Boolean(data?.claims?.sub);
}
