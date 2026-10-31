import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { supabaseUrl } from "./env";

// サーバーだけで使う管理用(RLS を通らない)。編集者の追加・削除に使う。
// Vercel の環境変数 SUPABASE_SECRET_KEY(Supabase > Project Settings > API Keys の Secret key)が必要
export const adminConfigured = () => Boolean(process.env.SUPABASE_SECRET_KEY);

export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY が設定されていません");
  return createClient<Database>(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}
