-- ファンキーズ打撃成績: 権限 (RLS)
-- 読み取りは誰でも(ログイン不要)、書き込みは editors に登録されたユーザーだけ。
-- editors 自体は、ログインした本人が自分の行を読めるだけにする(編集者の一覧を外に出さない)。

create function public.is_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.editors where user_id = (select auth.uid()))
$$;

revoke execute on function public.is_editor() from public;
grant execute on function public.is_editor() to anon, authenticated;

-- 閲覧用の7テーブルに、同じポリシーをまとめて付ける
do $$
declare
  t text;
begin
  foreach t in array array[
    'players', 'season_numbers', 'games', 'game_participants',
    'plate_appearances', 'season_baselines', 'team_season_baselines'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "%1$s: 誰でも閲覧可" on public.%1$I for select to anon, authenticated using (true)', t);
    execute format(
      'create policy "%1$s: 編集者のみ追加" on public.%1$I for insert to authenticated with check ((select public.is_editor()))', t);
    execute format(
      'create policy "%1$s: 編集者のみ更新" on public.%1$I for update to authenticated using ((select public.is_editor())) with check ((select public.is_editor()))', t);
    execute format(
      'create policy "%1$s: 編集者のみ削除" on public.%1$I for delete to authenticated using ((select public.is_editor()))', t);
  end loop;
end
$$;

alter table public.editors enable row level security;
create policy "editors: 本人の行のみ閲覧可" on public.editors
  for select to authenticated using (user_id = (select auth.uid()));
-- editors への書き込みポリシーは作らない(ダッシュボード / service_role からのみ変更)

-- テーブル権限(RLS の前段)。Supabase の既定に頼らず明示しておく
grant select on
  public.players, public.season_numbers, public.games, public.game_participants,
  public.plate_appearances, public.season_baselines, public.team_season_baselines
  to anon, authenticated;
grant insert, update, delete on
  public.players, public.season_numbers, public.games, public.game_participants,
  public.plate_appearances, public.season_baselines, public.team_season_baselines
  to authenticated;
revoke all on public.editors from anon, authenticated;
grant select on public.editors to authenticated;
