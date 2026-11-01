-- 当日のお金の項目に「グラウンド代＋審判代」を足す
alter table public.game_costs drop constraint game_costs_item_check;
alter table public.game_costs add constraint game_costs_item_check
  check (item in ('ground', 'umpire', 'ground_umpire', 'opponent', 'other'));
