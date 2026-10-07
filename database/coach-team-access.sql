-- Registered accounts become coaches through this admin-only operation.
-- Team permissions use database assignments, so revocation does not wait for JWT expiry.
create table public.club_coach_teams (
  user_id uuid not null references public.profiles(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  primary key(user_id, team_id)
);
create index club_coach_teams_team_idx on public.club_coach_teams(team_id);
alter table public.club_coach_teams enable row level security;
revoke all on public.club_coach_teams from anon, authenticated;
grant select on public.club_coach_teams to authenticated;
create policy coach_assignment_read on public.club_coach_teams for select to authenticated
  using (user_id=(select auth.uid()) or public.is_admin());

create or replace function public.club_staff_team(team uuid) returns boolean
language sql stable set search_path='' as $$
  select public.is_admin() or exists (
    select 1 from public.club_coach_teams c
    where c.user_id=(select auth.uid()) and c.team_id=team
  )
$$;

create function public.club_assign_coach_teams(target uuid, team_ids uuid[]) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not public.is_admin() then raise exception 'Endast administratörer kan ändra tränarbehörighet.'; end if;
  if target is null or target=auth.uid() then raise exception 'Det egna administratörskontot kan inte ändras.'; end if;
  perform 1 from public.profiles where id=target for update;
  if not found then raise exception 'Tränaren måste först registrera ett konto.'; end if;
  if exists (select 1 from public.profiles where id=target and role='admin') or
     exists (select 1 from auth.users where id=target and raw_app_meta_data->>'club_role'='admin')
  then raise exception 'Ett administratörskonto kan inte ändras till tränare.'; end if;
  if team_ids is null or exists (
    select 1 from unnest(team_ids) t where t is null or not exists (select 1 from public.teams where id=t)
  ) then raise exception 'Välj giltiga lag.'; end if;
  delete from public.club_coach_teams where user_id=target;
  insert into public.club_coach_teams(user_id,team_id)
    select target,t from (select distinct unnest(team_ids) t) s;
  update public.profiles set role=case when cardinality(team_ids)>0 then 'coach' else 'parent' end where id=target;
end;
$$;
revoke all on function public.club_assign_coach_teams(uuid,uuid[]) from public, anon;
grant execute on function public.club_assign_coach_teams(uuid,uuid[]) to authenticated;

grant update(technical,tactical,physical,psychological,priorities,goals,review_date) on public.club_development to authenticated;

create policy development_edit on public.club_development for update to authenticated
using (exists (select 1 from public.players p where p.id=player_id and public.club_staff_team(p.team_id)))
with check (exists (select 1 from public.players p where p.id=player_id and public.club_staff_team(p.team_id)));
notify pgrst, 'reload schema';
