import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { supabaseKey, supabaseUrl } from "./env";

// Client Component 用
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseKey);
}
