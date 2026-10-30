import type { Metadata } from "next";
import { connection } from "next/server";
import { getLedgerFormOptions } from "@/lib/data/ledger";
import { todayInJapan } from "@/lib/season";
import { createLedgerEntry } from "../actions";
import { LedgerForm } from "../ledger-form";

export const metadata: Metadata = { title: "入出金を追加" };

export default async function NewLedgerEntryPage({ searchParams }: PageProps<"/admin/ledger/new">) {
  const query = await searchParams;
  await connection(); // 今日の日付を既定値にするので、リクエストごとに描画する
  const { players, games } = await getLedgerFormOptions();
  const kind = query.kind === "income" ? "income" : "expense";

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-bold">入出金を追加</h1>
      <LedgerForm
        action={createLedgerEntry}
        players={players}
        games={games}
        initial={{
          entryDate: todayInJapan(new Date()),
          kind,
          category: "",
          amount: "",
          payer: "club",
          playerId: "",
          settled: false,
          settledOn: "",
          gameId: "",
          memo: "",
        }}
        submitLabel="保存する"
      />
    </section>
  );
}
