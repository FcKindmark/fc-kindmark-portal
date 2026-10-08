create or replace function public.club_set_team_coach(target uuid, team uuid, assigned boolean) returns void
language plpgsql security definer set search_path='' as $$
declare team_ids uuid[];
begin
 if not public.is_admin() then raise exception 'Endast administratörer kan ändra tränarbehörighet.';end if;
 if assigned is null or team is null or not exists(select 1 from public.teams where id=team) then raise exception 'Välj ett giltigt lag.';end if;
 perform 1 from public.profiles where id=target for update;
 if not found then raise exception 'Välj ett registrerat medlemskonto.';end if;
 select coalesce(array_agg(c.team_id),'{}'::uuid[]) into team_ids from public.club_coach_teams c where c.user_id=target and c.team_id<>team;
 if assigned then team_ids:=array_append(team_ids,team);end if;
 perform public.club_assign_coach_teams(target,team_ids);
end;$$;
revoke all on function public.club_set_team_coach(uuid,uuid,boolean) from public,anon;
grant execute on function public.club_set_team_coach(uuid,uuid,boolean) to authenticated;
notify pgrst,'reload schema';
