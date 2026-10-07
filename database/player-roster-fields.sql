-- Optional roster fields. Existing player and team RLS policies still apply.
alter table public.players add column if not exists birth_year integer
  check (birth_year between 1900 and 2100);
alter table public.players add column if not exists gender text
  check (gender in ('boy', 'girl'));
alter table public.players add column if not exists sport_id text;
create unique index if not exists players_sport_id_unique
  on public.players (sport_id) where sport_id is not null;
