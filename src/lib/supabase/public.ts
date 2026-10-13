import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { supabaseKey, supabaseUrl } from "./env";

// 誰でも見られるデータの読み取り用。Cookie を使わないので 'use cache' の中で使える。
// RLS 上は匿名ユーザーとして扱われる(閲覧のみ)
export function createPublicClient() {
  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    // 個々の通信は Next.js のデータキャッシュに入れない。キャッシュは呼び出し側の 'use cache' に一本化し、
    // updateTag(STATS_TAG) で確実に消せるようにする(ここで溜めると古い結果がビルドをまたいで残る)
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}
