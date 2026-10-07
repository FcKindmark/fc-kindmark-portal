begin;
insert into public.teams(id,name,age_group) values('00000000-0000-0000-0000-000000000091','Temporary deletion test','Test');
insert into public.players(id,name,team_id) values('00000000-0000-0000-0000-000000000092','Temporary player','00000000-0000-0000-0000-000000000091');
insert into public.trainings(id,date,time,team_id) values('00000000-0000-0000-0000-000000000093',current_date,'18:30','00000000-0000-0000-0000-000000000091');
insert into public.matches(id,date,opponent,team_id) values('00000000-0000-0000-0000-000000000094',current_date,'Temporary opponent','00000000-0000-0000-0000-000000000091');
insert into public.club_equipment(player_id,size,package,status) values('00000000-0000-0000-0000-000000000092','M','basic','ordered');
insert into public.club_member_cards(name,player_id) values('Temporary member','00000000-0000-0000-0000-000000000092');
insert into public.payments(player_name,amount,player_id,status) values('Temporary player',150,'00000000-0000-0000-0000-000000000092','pending');
insert into public.club_attendance(training_id,player_id,present) values('00000000-0000-0000-0000-000000000093','00000000-0000-0000-0000-000000000092',true);
insert into public.club_match_calls(match_id,player_id) values('00000000-0000-0000-0000-000000000094','00000000-0000-0000-0000-000000000092');
insert into public.club_match_replies(match_id,player_id,attending) values('00000000-0000-0000-0000-000000000094','00000000-0000-0000-0000-000000000092',true);
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000077","role":"authenticated","app_metadata":{"club_role":"parent"}}',true);
set local role authenticated;
do $$ begin
  begin
    perform public.club_delete_player('00000000-0000-0000-0000-000000000092');
    raise exception 'Parent deleted player';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000077","role":"authenticated","app_metadata":{"club_role":"admin"}}',true);
do $$ begin
 if not public.club_delete_player('00000000-0000-0000-0000-000000000092') then raise exception 'Player deletion failed'; end if;
 if exists(select 1 from public.club_member_cards where player_id='00000000-0000-0000-0000-000000000092') or exists(select 1 from public.payments where player_id='00000000-0000-0000-0000-000000000092') or exists(select 1 from public.club_equipment where player_id='00000000-0000-0000-0000-000000000092') or exists(select 1 from public.club_match_replies where player_id='00000000-0000-0000-0000-000000000092') then raise exception 'Dependent player records remain'; end if;
end $$;
insert into public.players(id,name,team_id) values('00000000-0000-0000-0000-000000000092','Player retained after team deletion','00000000-0000-0000-0000-000000000091');
do $$ begin
 if not public.club_delete_team('00000000-0000-0000-0000-000000000091') then raise exception 'Team deletion failed'; end if;
 if not exists(select 1 from public.players where id='00000000-0000-0000-0000-000000000092' and team_id is null) then raise exception 'Player not retained'; end if;
 if exists(select 1 from public.trainings where id='00000000-0000-0000-0000-000000000093') or exists(select 1 from public.matches where id='00000000-0000-0000-0000-000000000094') then raise exception 'Team events remain'; end if;
end $$;
select 'PASS: non-admin denied; player dependencies removed atomically; team events removed and players retained' as result;
rollback;
