-- 試合の当日のお金(グラウンド代・審判代・相手チームへの支払いなど)。
--   試合前に予定として登録し、誰でも見られる(前日の LINE にも載せる)。
--   相手チームから受け取るお金は、支払いの「うち相手チームから」(opponent_share)として合算する
--   (例: 審判代 7,000円のうち 5,000円は相手チームから → こちらの負担は 2,000円)。
--   払う人(部費から / 立て替え)が決まったら、こちらの負担分を経費(ledger_entries)に記録して ledger_entry_id でつなぐ。

-- 経費の支出に「相手チームへ」を足す
alter table public.ledger_entries drop constraint ledger_category;
alter table public.ledger_entries add constraint ledger_category check (
  (kind = 'income' and category in ('dues', 'carryover', 'other_income')) or
  (kind = 'expense' and category in ('ground', 'opponent', 'equipment', 'tournament', 'social', 'other_expense'))
);

create table public.game_costs (
  id              uuid primary key default gen_random_uuid(),
  game_id         uuid not null references public.games (id) on delete cascade,
  item            text not null check (item in ('ground', 'umpire', 'opponent', 'other')), -- グラウンド代 / 審判代 / 相手チームへ / その他
  amount          int  not null check (amount between 1 and 10000000),                     -- 支払う総額
  opponent_share  int  not null default 0,                                                  -- うち相手チームから受け取って充てる額
  payer           text not null default 'undecided' check (payer in ('undecided', 'club', 'player')),
  player_id       uuid references public.players (id) on delete restrict,                  -- 立て替えた人
  memo            text check (memo is null or length(memo) <= 100),
  ledger_entry_id uuid references public.ledger_entries (id) on delete set null,
  created_at      timestamptz not null default now(),
  constraint game_costs_share check (opponent_share >= 0 and opponent_share <= amount and (item <> 'opponent' or opponent_share = 0)),
  constraint game_costs_payer check ((payer = 'player') = (player_id is not null))
);
create index game_costs_game_idx on public.game_costs (game_id);

alter table public.game_costs enable row level security;
create policy "game_costs: 誰でも閲覧可" on public.game_costs for select to anon, authenticated using (true);
create policy "game_costs: 編集者のみ追加" on public.game_costs for insert to authenticated with check ((select public.is_editor()));
create policy "game_costs: 編集者のみ更新" on public.game_costs for update to authenticated using ((select public.is_editor())) with check ((select public.is_editor()));
create policy "game_costs: 編集者のみ削除" on public.game_costs for delete to authenticated using ((select public.is_editor()));
grant select on public.game_costs to anon, authenticated;
grant insert, update, delete on public.game_costs to authenticated;
