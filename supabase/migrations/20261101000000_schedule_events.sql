-- 日付の中の別の予定(忘年会・飲み会など)と、その出欠。
--   その日の活動・試合とは別に ○△× を集計する。1日に何件でも足せる(編集者のみ)
--   回答は answer_event 関数から(ログインなし)。対象の人の確かめ方は answer_attendance と同じ

create table public.schedule_events (
  id         uuid primary key default gen_random_uuid(),
  day        date not null,
  title      text not null check (length(trim(title)) between 1 and 30),
  start_time time,
  place      text check (place is null or length(place) <= 60),
  created_at timestamptz not null default now()
);
create index schedule_events_day_idx on public.schedule_events (day);

create table public.event_answers (
  event_id   uuid not null references public.schedule_events (id) on delete cascade,
  player_id  uuid not null references public.players (id) on delete cascade,
  answer     text not null check (answer in ('yes', 'maybe', 'no')),
  comment    text check (comment is null or length(comment) <= 100),
  updated_at timestamptz not null default now(),
  primary key (event_id, player_id)
);
create index event_answers_player_idx on public.event_answers (player_id);

-- 別の予定への回答(ログインなしでも呼べる)。p_answer が null なら回答を消す
create function public.answer_event(p_event_id uuid, p_player_id uuid, p_answer text, p_comment text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date;
begin
  select day into v_day from public.schedule_events where id = p_event_id;
  if v_day is null or v_day < current_date - 90 or v_day > current_date + 400 then
    raise exception '回答できない予定です' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.players
     where id = p_player_id
       and kind in ('regular', 'manager')
       and joined_on <= v_day
       and (left_on is null or left_on >= v_day)
  ) then
    raise exception '回答できないメンバーです' using errcode = '22023';
  end if;

  if p_answer is null then
    delete from public.event_answers where event_id = p_event_id and player_id = p_player_id;
    return;
  end if;
  if p_answer not in ('yes', 'maybe', 'no') then
    raise exception '回答が正しくありません' using errcode = '22023';
  end if;

  insert into public.event_answers (event_id, player_id, answer, comment, updated_at)
  values (p_event_id, p_player_id, p_answer, nullif(trim(left(coalesce(p_comment, ''), 100)), ''), now())
  on conflict (event_id, player_id)
  do update set answer = excluded.answer, comment = excluded.comment, updated_at = now();
end
$$;

revoke execute on function public.answer_event(uuid, uuid, text, text) from public;
grant execute on function public.answer_event(uuid, uuid, text, text) to anon, authenticated;

alter table public.schedule_events enable row level security;
alter table public.event_answers enable row level security;
create policy "schedule_events: 誰でも閲覧可" on public.schedule_events for select to anon, authenticated using (true);
create policy "schedule_events: 編集者のみ追加" on public.schedule_events for insert to authenticated with check ((select public.is_editor()));
create policy "schedule_events: 編集者のみ更新" on public.schedule_events for update to authenticated using ((select public.is_editor())) with check ((select public.is_editor()));
create policy "schedule_events: 編集者のみ削除" on public.schedule_events for delete to authenticated using ((select public.is_editor()));
create policy "event_answers: 誰でも閲覧可" on public.event_answers for select to anon, authenticated using (true);
create policy "event_answers: 編集者のみ削除" on public.event_answers for delete to authenticated using ((select public.is_editor()));

grant select on public.schedule_events, public.event_answers to anon, authenticated;
grant insert, update, delete on public.schedule_events to authenticated;
grant delete on public.event_answers to authenticated;
