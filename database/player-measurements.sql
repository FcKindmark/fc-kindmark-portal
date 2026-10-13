create table public.club_player_measurements (
 id uuid primary key default gen_random_uuid(),
 player_id uuid not null references public.players(id) on delete cascade,
 measured_on date not null default current_date,
 measurement text not null check(length(trim(measurement)) between 1 and 120),
 value numeric not null check(value>=0 and value<=1000000),
 unit text not null check(length(trim(unit)) between 1 and 24),
 notes text not null default '' check(length(notes)<=2000),
 created_by uuid default auth.uid() references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create index player_measurements_history on public.club_player_measurements(player_id,measured_on desc,created_at desc);
alter table public.club_player_measurements enable row level security;
revoke all on public.club_player_measurements from anon,authenticated;
grant select,insert,update,delete on public.club_player_measurements to authenticated;
create policy measurements_read on public.club_player_measurements for select to authenticated using (
 public.is_admin() or public.club_owns_player(player_id) or exists(select 1 from public.players p where p.id=player_id and public.club_staff_team(p.team_id))
);
create policy measurements_add on public.club_player_measurements for insert to authenticated with check (
 created_by=(select auth.uid()) and (public.is_admin() or exists(select 1 from public.players p where p.id=player_id and public.club_staff_team(p.team_id)))
);
create policy measurements_edit on public.club_player_measurements for update to authenticated using (
 public.is_admin() or exists(select 1 from public.players p where p.id=player_id and public.club_staff_team(p.team_id))
) with check (
 public.is_admin() or exists(select 1 from public.players p where p.id=player_id and public.club_staff_team(p.team_id))
);
create policy measurements_delete on public.club_player_measurements for delete to authenticated using(public.is_admin());
notify pgrst,'reload schema';
