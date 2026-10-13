-- Deliberately expose only public team identity, never contacts or measurements.
create or replace function public.club_my_team_roster()
returns table(name text,number integer,"position" text,team_name text)
language sql stable security definer set search_path=''
as $$
 select p.name,p.number,p.position,t.name
 from public.players p join public.teams t on t.id=p.team_id
 where exists (
  select 1 from public.club_player_access a
  join public.players own on own.id=a.player_id
  join public.profiles profile on profile.id=a.user_id
  where a.user_id=(select auth.uid()) and profile.role='player'
    and own.team_id=p.team_id
 )
 order by t.name,p.name
$$;
revoke all on function public.club_my_team_roster() from public,anon;
grant execute on function public.club_my_team_roster() to authenticated;
notify pgrst,'reload schema';
