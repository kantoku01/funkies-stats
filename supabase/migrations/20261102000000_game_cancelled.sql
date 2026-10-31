-- 試合の状態に「雨天中止」(cancelled)を足す。
--   中止の試合はスコアと勝敗を持たず、試合数・出席・欠席には数えない(成績は終了した試合だけを数える)

alter table public.games drop constraint games_status_check;
alter table public.games add constraint games_status_check check (status in ('scheduled', 'completed', 'cancelled'));

alter table public.games drop constraint games_status_result;
alter table public.games add constraint games_status_result check (
  (status = 'completed' and result is not null) or
  (status in ('scheduled', 'cancelled') and result is null and team_score is null and opponent_score is null)
);
