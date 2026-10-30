import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLedgerEntryForAdmin, getLedgerFormOptions } from "@/lib/data/ledger";
import { CATEGORY_LABEL, formatYen } from "@/lib/ledger/categories";
import { updateLedgerEntry } from "../actions";
import { LedgerForm } from "../ledger-form";
import { DeleteLedgerButton } from "./delete-button";

export const metadata: Metadata = { title: "入出金の編集" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditLedgerEntryPage({ params }: PageProps<"/admin/ledger/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [entry, { players, games }] = await Promise.all([getLedgerEntryForAdmin(id), getLedgerFormOptions()]);
  if (!entry) notFound();

  const label = `${entry.entry_date.replaceAll("-", "/")} ${CATEGORY_LABEL[entry.category]} ${formatYen(entry.amount)}`;
  return (
    <section className="space-y-6">
      <h1 className="text-xl font-bold">入出金の編集</h1>
      <LedgerForm
        action={updateLedgerEntry}
        entryId={entry.id}
        players={players}
        games={games}
        initial={{
          entryDate: entry.entry_date,
          kind: entry.kind,
          category: entry.category,
          amount: String(entry.amount),
          payer: entry.kind === "expense" && entry.player_id ? "advance" : "club",
          playerId: entry.player_id ?? "",
          settled: entry.settled_on !== null,
          settledOn: entry.settled_on ?? "",
          gameId: entry.game_id ?? "",
          memo: entry.memo ?? "",
        }}
        submitLabel="保存する"
      />
      <hr className="border-slate-200" />
      <DeleteLedgerButton entryId={entry.id} label={label} />
    </section>
  );
}
