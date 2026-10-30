import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { LedgerEntry } from "@/lib/ledger/summary";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "./fetch-all";

// チーム経費のキャッシュタグ。入出金を書き換えたら updateTag(LEDGER_TAG) を呼ぶ
export const LEDGER_TAG = "ledger";

const ENTRY_COLUMNS = "id, entry_date, season, kind, category, amount, memo, player_id, settled_on, game_id" as const;

export type LedgerData = {
  entries: LedgerEntry[]; // 全期間(残高の計算に使う)。新しい順
  players: { id: string; full_name: string; kind: "regular" | "guest"; joined_on: string | null; left_on: string | null }[];
  games: { id: string; game_date: string; opponent: string | null }[];
};

// チーム経費(誰でも閲覧)
export async function getLedger(): Promise<LedgerData> {
  "use cache";
  cacheTag(LEDGER_TAG);
  cacheLife("minutes");

  const supabase = createPublicClient();
  const [entries, players, games] = await Promise.all([
    fetchAll((from, to) =>
      supabase
        .from("ledger_entries")
        .select(ENTRY_COLUMNS)
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false })
        .range(from, to),
    ),
    fetchAll((from, to) =>
      supabase.from("players").select("id, full_name, kind, joined_on, left_on").order("created_at").order("id").range(from, to),
    ),
    fetchAll((from, to) =>
      supabase.from("games").select("id, game_date, opponent").order("game_date", { ascending: false }).range(from, to),
    ),
  ]);
  return { entries, players, games };
}

// 編集画面用(ログイン中のセッションで、キャッシュせず最新を読む)
export async function getLedgerEntryForAdmin(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("ledger_entries").select(ENTRY_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getLedgerFormOptions() {
  const supabase = await createClient();
  const [players, games] = await Promise.all([
    fetchAll((from, to) =>
      supabase.from("players").select("id, full_name, kind, left_on").order("created_at").order("id").range(from, to),
    ),
    fetchAll((from, to) =>
      supabase.from("games").select("id, game_date, opponent").order("game_date", { ascending: false }).range(from, to),
    ),
  ]);
  return { players, games };
}
