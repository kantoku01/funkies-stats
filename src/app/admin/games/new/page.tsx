import type { Metadata } from "next";
import { connection } from "next/server";
import { getTournamentsForAdmin, getVenuesForAdmin } from "@/lib/data/games";
import { defaultMeetTime } from "@/lib/games/form";
import { parseActivityNote } from "@/lib/schedule/month";
import { createClient } from "@/lib/supabase/server";
import { todayInJapan } from "@/lib/season";
import { createGame } from "../actions";
import { GameForm } from "../game-form";

export const metadata: Metadata = { title: "試合を追加" };

export default async function NewGamePage({ searchParams }: PageProps<"/admin/games/new">) {
  const query = await searchParams;
  const dateParam = typeof query.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(query.date) ? query.date : null;
  // 今日の日付を既定値にするので、リクエストごとに描画する
  await connection();
  const supabase = await createClient();
  const [tournaments, venues, { data: members }] = await Promise.all([
    getTournamentsForAdmin(),
    getVenuesForAdmin(),
    // 当日のお金を立て替える人の候補: 在籍中の選手とマネージャー
    supabase.from("players").select("id, full_name").in("kind", ["regular", "manager"]).is("left_on", null).order("full_name"),
  ]);
  // 予定・出欠ページの「試合の予定にする」から来たら、活動予定のメモから開始時間と場所を引き継ぐ
  const fromSchedule = query.from === "schedule" && dateParam !== null;
  let fromNote: { start: string | null; venue: string | null } = { start: null, venue: null };
  if (fromSchedule) {
    const { data } = await supabase.from("schedule_dates").select("note").eq("day", dateParam).maybeSingle();
    fromNote = parseActivityNote(data?.note ?? null);
  }
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-bold">試合を追加</h1>
      <GameForm
        action={createGame}
        tournaments={tournaments}
        venues={venues}
        costMembers={(members ?? []).map((m) => ({ id: m.id, name: m.full_name }))}
        initial={{
          status: "scheduled",
          startTime: fromNote.start ?? "",
          meetTime: fromNote.start ? defaultMeetTime(fromNote.start) : "",
          venue: fromNote.venue ?? "",
          venueMapUrl: (fromNote.venue && venues.find((x) => x.venue === fromNote.venue)?.mapUrl) || "",
          uniform: "",
          bringBases: "",
          gameDate: dateParam ?? todayInJapan(new Date()),
          opponent: "",
          teamScore: "",
          opponentScore: "",
          result: "",
          memo: "",
          gameType: "open",
          tournamentId: "",
          newTournament: "",
          stage: "",
          roundLabel: "",
        }}
        cancelHref={fromSchedule ? `/schedule/${dateParam!.slice(0, 7)}` : "/games"}
        scheduleDay={fromSchedule ? dateParam! : undefined}
        submitLabel="保存する"
      />
    </section>
  );
}
