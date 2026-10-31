-- 試合の場所に Google マップの URL を足す(試合前日の LINE の連絡に入れる)

alter table public.games
  add column venue_map_url text check (venue_map_url is null or (length(venue_map_url) <= 500 and venue_map_url ~ '^https?://'));
