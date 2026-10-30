-- チーム経費: 入出金を1件1行で記録する。残高や集計は保存せず、アプリ側で計算する。
--   収入: 年会費(納入者が必要)/ 繰越金 / その他収入
--   支出: player_id が空なら「部費から直接」、入っていれば「その人が立て替え」。
--         立て替えは、部費から精算した日を settled_on に入れる。

create table public.ledger_entries (
  id         uuid primary key default gen_random_uuid(),
  entry_date date not null,
  season     int generated always as (extract(year from entry_date)::int) stored,
  kind       text not null check (kind in ('income', 'expense')),
  category   text not null,
  amount     int  not null check (amount between 1 and 10000000),
  memo       text check (memo is null or length(memo) <= 200),
  player_id  uuid references public.players (id) on delete restrict, -- 年会費の納入者 / 立て替えた人
  settled_on date,                                                    -- 立て替えを精算した日
  game_id    uuid references public.games (id) on delete set null,   -- 関連する試合(任意)
  created_at timestamptz not null default now(),
  constraint ledger_category check (
    (kind = 'income' and category in ('dues', 'carryover', 'other_income')) or
    (kind = 'expense' and category in ('ground', 'umpire', 'equipment', 'tournament', 'social', 'other_expense'))
  ),
  -- 収入: 年会費だけ納入者が必要
  constraint ledger_income_player check (kind = 'expense' or (category = 'dues') = (player_id is not null)),
  -- 精算日は立て替えの支出にだけ入る
  constraint ledger_settled check (settled_on is null or (kind = 'expense' and player_id is not null))
);
create index ledger_entries_season_idx on public.ledger_entries (season, entry_date desc);
create index ledger_entries_player_idx on public.ledger_entries (player_id);

alter table public.ledger_entries enable row level security;
create policy "ledger_entries: 誰でも閲覧可" on public.ledger_entries
  for select to anon, authenticated using (true);
create policy "ledger_entries: 編集者のみ追加" on public.ledger_entries
  for insert to authenticated with check ((select public.is_editor()));
create policy "ledger_entries: 編集者のみ更新" on public.ledger_entries
  for update to authenticated using ((select public.is_editor())) with check ((select public.is_editor()));
create policy "ledger_entries: 編集者のみ削除" on public.ledger_entries
  for delete to authenticated using ((select public.is_editor()));

grant select on public.ledger_entries to anon, authenticated;
grant insert, update, delete on public.ledger_entries to authenticated;
