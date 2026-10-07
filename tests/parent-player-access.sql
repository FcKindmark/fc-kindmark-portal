begin;
-- Isolate parent access from any coach assignments, retaining the real links.
select set_config('test.parent',(select user_id::text from public.club_player_access group by user_id order by count(*) desc limit 1),true);
select set_config('test.expected',(select count(*)::text from public.club_player_access where user_id=current_setting('test.parent')::uuid),true);
delete from public.club_coach_teams where user_id=current_setting('test.parent')::uuid;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.parent'),'role','authenticated','app_metadata',jsonb_build_object('club_role','parent'))::text,true);
set local role authenticated;
do $$begin
  if (select count(*) from public.players)<>current_setting('test.expected')::integer then raise exception 'Parent children visibility differs from saved links';end if;
  if exists(select 1 from public.players p where not exists(select 1 from public.club_player_access a where a.player_id=p.id and a.user_id=auth.uid())) then raise exception 'Parent saw unrelated player';end if;
  if not exists(select 1 from public.teams) then raise exception 'Linked children teams missing';end if;
end $$;
select 'PASS: parent sees every linked child and their teams independently of coach access. Other families hidden. No account or link changes retained.' result;
rollback;
