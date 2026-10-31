"use server";

import { updateTag } from "next/cache";
import { getCurrentEditor } from "@/lib/auth";
import { SCHEDULE_TAG } from "@/lib/data/schedule";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// day は日付("2026-12-20")か、別の予定("e:<id>")
export type AnswerInput = { day: string; answer: "yes" | "maybe" | "no" | null; comment: string };
const EVENT_KEY = /^e:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
export type SaveAnswersResult = { ok: true } | { ok: false; error: string };

// 出欠の回答(ログインなしで呼べる)。DB の関数が、対象のメンバーと日付かを確かめる
export async function saveAnswers(playerId: string, answers: AnswerInput[]): Promise<SaveAnswersResult> {
  if (!UUID.test(playerId) || !Array.isArray(answers) || answers.length > 40) {
    return { ok: false, error: "回答の内容が正しくありません。" };
  }
  for (const a of answers) {
    const target = DATE.test(a.day) || EVENT_KEY.test(a.day);
    if (!target || !(a.answer === null || ["yes", "maybe", "no"].includes(a.answer)) || String(a.comment ?? "").length > 100) {
      return { ok: false, error: "回答の内容が正しくありません。" };
    }
  }

  const supabase = createPublicClient();
  for (const a of answers) {
    const eventId = EVENT_KEY.exec(a.day)?.[1];
    const { error } = eventId
      ? await supabase.rpc("answer_event", {
          p_event_id: eventId,
          p_player_id: playerId,
          p_answer: a.answer,
          p_comment: a.comment || null,
        })
      : await supabase.rpc("answer_attendance", {
          p_day: a.day,
          p_player_id: playerId,
          p_answer: a.answer,
          p_comment: a.comment || null,
        });
    if (error) {
      updateTag(SCHEDULE_TAG);
      const what = eventId ? "別の予定" : a.day.slice(5).replace("-", "/");
      return { ok: false, error: `${what} の回答を保存できませんでした。` };
    }
  }
  updateTag(SCHEDULE_TAG);
  return { ok: true };
}

export type ScheduleEditState = { message: string | null };

// 日付の予定(活動予定 / 休み / 未定)とメモ。日曜以外の日付を足すときにも使う(編集者のみ)
export async function saveScheduleDate(_prev: ScheduleEditState, formData: FormData): Promise<ScheduleEditState> {
  if (!(await getCurrentEditor())) return { message: "編集者としてログインしてください。" };
  const day = String(formData.get("day") ?? "");
  const kind = String(formData.get("kind") ?? "tbd");
  const note = String(formData.get("note") ?? "").trim();
  const extra = formData.get("extra") === "1";
  if (!DATE.test(day) || !["practice", "off", "tbd"].includes(kind) || note.length > 100) {
    return { message: "入力内容が正しくありません。" };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("schedule_dates")
    .upsert({ day, kind: kind as "practice" | "off" | "tbd", note: note || null, extra }, { onConflict: "day" });
  if (error) return { message: "保存に失敗しました。" };
  updateTag(SCHEDULE_TAG);
  return { message: null };
}

// 足した日付を外す(編集者のみ)。その日の回答も消す
export async function removeExtraDate(_prev: ScheduleEditState, formData: FormData): Promise<ScheduleEditState> {
  if (!(await getCurrentEditor())) return { message: "編集者としてログインしてください。" };
  const day = String(formData.get("day") ?? "");
  if (!DATE.test(day)) return { message: "日付が正しくありません。" };
  const supabase = await createClient();
  // 足した日付だけを外す(日曜の回答を消さないように、先に確かめる)
  const { data: removed, error } = await supabase.from("schedule_dates").delete().eq("day", day).eq("extra", true).select("day");
  if (error || !removed?.length) return { message: "削除できる日付ではありません。" };
  const { error: answerError } = await supabase.from("attendance_answers").delete().eq("day", day);
  if (answerError) return { message: "回答の削除に失敗しました。" };
  updateTag(SCHEDULE_TAG);
  return { message: null };
}

// 日付の中の別の予定(忘年会など)を足す・直す(編集者のみ)。id があれば更新
export async function saveScheduleEvent(_prev: ScheduleEditState, formData: FormData): Promise<ScheduleEditState> {
  if (!(await getCurrentEditor())) return { message: "編集者としてログインしてください。" };
  const id = String(formData.get("id") ?? "");
  const day = String(formData.get("day") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const startTime = String(formData.get("startTime") ?? "").trim();
  const place = String(formData.get("place") ?? "").trim();
  if (!DATE.test(day) || (id && !UUID.test(id))) return { message: "入力内容が正しくありません。" };
  if (!title || title.length > 30) return { message: "名前を30文字以内で入れてください(例: 忘年会)。" };
  if (startTime && !/^\d{2}:\d{2}$/.test(startTime)) return { message: "時間は 19:00 のように入れてください。" };
  if (place.length > 60) return { message: "場所は60文字以内で入れてください。" };
  const record = { day, title, start_time: startTime || null, place: place || null };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("schedule_events").update(record).eq("id", id)
    : await supabase.from("schedule_events").insert(record);
  if (error) return { message: "保存に失敗しました。" };
  updateTag(SCHEDULE_TAG);
  return { message: null };
}

// 別の予定を消す(編集者のみ)。回答も一緒に消える
export async function removeScheduleEvent(_prev: ScheduleEditState, formData: FormData): Promise<ScheduleEditState> {
  if (!(await getCurrentEditor())) return { message: "編集者としてログインしてください。" };
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return { message: "予定が見つかりません。" };
  const supabase = await createClient();
  const { error } = await supabase.from("schedule_events").delete().eq("id", id);
  if (error) return { message: "削除に失敗しました。" };
  updateTag(SCHEDULE_TAG);
  return { message: null };
}
