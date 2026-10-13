import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import type { Database } from "@/types/database";
import { supabaseKey, supabaseUrl } from "./env";

// Server Component / Server Action / Route Handler 用
export async function createClient() {
  // セッションの検証でトークンの期限と現在時刻を比べるので、事前描画(プリフェッチ)では動かさず
  // 実際のリクエストのときだけ実行する
  await connection();
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Component からは書き込めない。セッション更新は proxy が行うので無視してよい
        }
      },
    },
  });
}
