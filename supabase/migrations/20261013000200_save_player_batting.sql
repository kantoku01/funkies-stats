-- 打撃入力: 1人分の打席結果をまとめて保存する。
-- 「その選手の打席を全部消して入れ直す + 打席外の盗塁を更新」を1つのトランザクションで行い、
-- 途中で失敗して打席が消えたままになるのを防ぐ。
-- security invoker(既定)なので、呼び出したユーザーの RLS がそのまま効く(編集者以外は失敗する)。

create function public.save_player_batting(
  p_game_id uuid,
  p_player_id uuid,
  p_plate_appearances jsonb, -- [{"result": "single", "rbi": 0, "stolen_bases": 1}, ...] を打席順に
  p_extra_stolen_bases int
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if jsonb_typeof(p_plate_appearances) is distinct from 'array' then
    raise exception '打席結果の形式が正しくありません' using errcode = '22023';
  end if;

  -- 参加者でなければ失敗させる(更新できた行がない = 参加者でない、または権限がない)
  update public.game_participants
     set extra_stolen_bases = p_extra_stolen_bases
   where game_id = p_game_id and player_id = p_player_id;
  if not found then
    raise exception '参加者として登録されていません' using errcode = 'P0002';
  end if;

  delete from public.plate_appearances
   where game_id = p_game_id and player_id = p_player_id;

  insert into public.plate_appearances (game_id, player_id, seq, result, rbi, stolen_bases)
  select p_game_id, p_player_id, e.ord::int, e.value ->> 'result',
         coalesce((e.value ->> 'rbi')::int, 0), coalesce((e.value ->> 'stolen_bases')::int, 0)
    from jsonb_array_elements(p_plate_appearances) with ordinality as e(value, ord);
end
$$;

revoke execute on function public.save_player_batting(uuid, uuid, jsonb, int) from public, anon;
grant execute on function public.save_player_batting(uuid, uuid, jsonb, int) to authenticated;
