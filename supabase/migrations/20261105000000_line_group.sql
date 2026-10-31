-- LINE 公式アカウントからチームのグループに送る連絡。
--   line_settings: 送り先のグループ(公式アカウントをグループに招待したときに自動で記録する。1行だけ)
--   line_posts:    送った記録。同じ連絡を二重に送らないため(手で送った前日連絡は自動で送らない)
--   書き込みはサーバー(シークレットキー)からだけ。編集者は送った記録とグループの有無を見られる

create table public.line_settings (
  id         boolean primary key default true check (id),
  group_id   text not null,
  updated_at timestamptz not null default now()
);

create table public.line_posts (
  id      uuid primary key default gen_random_uuid(),
  kind    text not null check (kind in ('day_before', 'schedule')), -- 試合前日の連絡 / スケジュール
  ref     text not null, -- day_before は試合 ID、schedule は試合のあった日
  auto    boolean not null default false, -- 自動で送ったか
  sent_at timestamptz not null default now(),
  unique (kind, ref)
);

alter table public.line_settings enable row level security;
alter table public.line_posts enable row level security;
create policy "line_settings: 編集者のみ閲覧可" on public.line_settings for select to authenticated using ((select public.is_editor()));
create policy "line_posts: 編集者のみ閲覧可" on public.line_posts for select to authenticated using ((select public.is_editor()));
revoke all on public.line_settings, public.line_posts from anon, authenticated;
grant select on public.line_settings, public.line_posts to authenticated;
