-- 別の予定(忘年会など)に備考を足す(会費・持ち物など)

alter table public.schedule_events
  add column note text check (note is null or length(note) <= 200);
