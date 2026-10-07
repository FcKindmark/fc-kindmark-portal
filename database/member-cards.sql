create table if not exists public.club_member_cards (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  player_id uuid references public.players(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  sport_id text unique,
  member_number text not null unique default ('FCK-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now()
);
create unique index if not exists club_member_cards_player_unique on public.club_member_cards(player_id) where player_id is not null;
alter table public.club_member_cards enable row level security;
revoke all on public.club_member_cards from anon, authenticated;
grant select, insert, update, delete on public.club_member_cards to authenticated;
create policy member_cards_read on public.club_member_cards for select to authenticated
  using (public.is_admin() or user_id = (select auth.uid()) or public.club_owns_player(player_id));
create policy member_cards_insert on public.club_member_cards for insert to authenticated with check (public.is_admin());
create policy member_cards_update on public.club_member_cards for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy member_cards_delete on public.club_member_cards for delete to authenticated using (public.is_admin());
