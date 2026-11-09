-- 試合の派遣審判: true = 有り / false = 無し / null = 未定

alter table public.games add column dispatched_umpire boolean;
