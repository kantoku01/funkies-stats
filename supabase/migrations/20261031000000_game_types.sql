-- 試合の種類(オープン戦 / 公式戦)と大会。
--   公式戦は 大会 → 段階(予選リーグ / 決勝トーナメント)→ 回戦など(自由入力: 「Aブロック第1戦」「準決勝」)
--   これまでに入力した試合はオープン戦として扱う(公式戦だったものは画面から直す)

create table public.tournaments (
  id         uuid primary key default gen_random_uuid(),
  season     int  not null check (season between 2000 and 2100),
  name       text not null check (length(trim(name)) between 1 and 60),
  created_at timestamptz not null default now(),
  unique (season, name)
);

alter table public.games
  add column game_type     text not null default 'open' check (game_type in ('open', 'official')),
  add column tournament_id uuid references public.tournaments (id) on delete restrict,
  add column stage         text check (stage in ('league', 'knockout')),
  add column round_label   text check (round_label is null or length(round_label) <= 30),
  -- オープン戦は大会情報を持たない。公式戦は大会と段階が必要
  add constraint games_type_detail check (
    (game_type = 'open' and tournament_id is null and stage is null and round_label is null) or
    (game_type = 'official' and tournament_id is not null and stage is not null)
  );
create index games_tournament_idx on public.games (tournament_id);

alter table public.tournaments enable row level security;
create policy "tournaments: 誰でも閲覧可" on public.tournaments for select to anon, authenticated using (true);
create policy "tournaments: 編集者のみ追加" on public.tournaments for insert to authenticated with check ((select public.is_editor()));
create policy "tournaments: 編集者のみ更新" on public.tournaments for update to authenticated using ((select public.is_editor())) with check ((select public.is_editor()));
create policy "tournaments: 編集者のみ削除" on public.tournaments for delete to authenticated using ((select public.is_editor()));
grant select on public.tournaments to anon, authenticated;
grant insert, update, delete on public.tournaments to authenticated;
