begin;
insert into public.matches(id,opponent,date,team_id)
values('00000000-0000-0000-0000-000000000088','Temporary permission test',current_date,(select id from public.teams where name='FC Kindmark P13-14'));
select set_config('test.player', (select id::text from public.players where team_id=(select team_id from public.matches where id='00000000-0000-0000-0000-000000000088') order by id limit 1),true);
select set_config('test.other_player', (select id::text from public.players where team_id=(select team_id from public.matches where id='00000000-0000-0000-0000-000000000088') and id<>current_setting('test.player')::uuid order by id limit 1),true);
select set_config('test.parent',(select user_id::text from public.club_player_access limit 1),true);
insert into public.club_player_access(user_id,player_id) values(current_setting('test.parent')::uuid,current_setting('test.player')::uuid) on conflict do nothing;
insert into public.club_match_calls(match_id,player_id) values
('00000000-0000-0000-0000-000000000088',current_setting('test.player')::uuid),
('00000000-0000-0000-0000-000000000088',current_setting('test.other_player')::uuid);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.parent'),'role','authenticated','app_metadata',jsonb_build_object('club_role','parent'))::text,true);
set local role authenticated;
insert into public.club_match_replies(match_id,player_id,attending) values('00000000-0000-0000-0000-000000000088',current_setting('test.player')::uuid,true);
do $$ begin
  if (select count(*) from public.club_match_calls where match_id='00000000-0000-0000-0000-000000000088')<>1 then raise exception 'Parent saw another child invitation'; end if;
  begin
    insert into public.club_match_replies(match_id,player_id,attending) values('00000000-0000-0000-0000-000000000088',current_setting('test.other_player')::uuid,true);
    raise exception 'Parent replied for another child';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.club_match_calls(match_id,player_id) values('00000000-0000-0000-0000-000000000088',current_setting('test.other_player')::uuid);
    raise exception 'Parent created an invitation';
  exception when insufficient_privilege then null; end;
end $$;
select 'PASS: own invitation and reply allowed; other child and invitation creation denied' as result;
rollback;
