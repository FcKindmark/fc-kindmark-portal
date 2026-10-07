begin;
select set_config('test.coach',(select id::text from public.profiles where id in (select id from auth.users where coalesce(raw_app_meta_data->>'club_role','parent')<>'admin') order by id limit 1),true);
select set_config('test.admin',(select id::text from auth.users where raw_app_meta_data->>'club_role'='admin' limit 1),true);
select set_config('test.team',(select team_id::text from public.players where team_id is not null order by team_id limit 1),true);
select set_config('test.other_team',(select team_id::text from public.players where team_id is not null and team_id<>current_setting('test.team')::uuid order by team_id limit 1),true);
select set_config('test.player',(select id::text from public.players where team_id=current_setting('test.team')::uuid limit 1),true);
select set_config('test.other_player',(select id::text from public.players where team_id=current_setting('test.other_team')::uuid limit 1),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.admin'),'role','authenticated','app_metadata',jsonb_build_object('club_role','admin'))::text,true);
set local role authenticated;
select public.club_assign_coach_teams(current_setting('test.coach')::uuid,array[current_setting('test.team')::uuid]);
insert into public.trainings(id,date,time,location,team_id) values
('00000000-0000-0000-0000-000000000081',current_date,'18:00','Coach test',current_setting('test.team')::uuid),
('00000000-0000-0000-0000-000000000082',current_date,'18:00','Other team',current_setting('test.other_team')::uuid);
insert into public.matches(id,date,opponent,team_id) values
('00000000-0000-0000-0000-000000000081',current_date,'Coach test',current_setting('test.team')::uuid),
('00000000-0000-0000-0000-000000000082',current_date,'Other team',current_setting('test.other_team')::uuid);
insert into public.club_development(id,player_id,technical,tactical,physical,psychological,priorities,goals,review_date) values
('00000000-0000-0000-0000-000000000081',current_setting('test.player')::uuid,'a','a','a','a','a','a',current_date),
('00000000-0000-0000-0000-000000000082',current_setting('test.other_player')::uuid,'a','a','a','a','a','a',current_date);
do $$declare denied boolean=false;begin
  begin perform public.club_assign_coach_teams(current_setting('test.admin')::uuid,array[current_setting('test.team')::uuid]);exception when raise_exception then denied=true;end;
  if not denied then raise exception 'Admin demotion accepted';end if;
  denied=false;
  begin perform public.club_assign_coach_teams(current_setting('test.coach')::uuid,array['00000000-0000-0000-0000-000000000099'::uuid]);exception when raise_exception then denied=true;end;
  if not denied or not public.club_staff_team(current_setting('test.team')::uuid) then raise exception 'Invalid team assignment accepted';end if;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.coach'),'role','authenticated','app_metadata',jsonb_build_object('club_role','parent'))::text,true);
do $$declare n integer;denied boolean=false;begin
  if not public.club_staff_team(current_setting('test.team')::uuid) or public.club_staff_team(current_setting('test.other_team')::uuid) then raise exception 'Incorrect team authorization';end if;
  if (select role from public.profiles where id=auth.uid())<>'coach' then raise exception 'Coach profile missing';end if;
  update public.trainings set location='Edited' where id='00000000-0000-0000-0000-000000000081';get diagnostics n=row_count;if n<>1 then raise exception 'Own training edit failed';end if;
  update public.trainings set location='Forbidden' where id='00000000-0000-0000-0000-000000000082';get diagnostics n=row_count;if n<>0 then raise exception 'Other training edited';end if;
  update public.matches set club_score=2,opponent_score=1 where id='00000000-0000-0000-0000-000000000081';get diagnostics n=row_count;if n<>1 then raise exception 'Own match edit failed';end if;
  update public.matches set club_score=9 where id='00000000-0000-0000-0000-000000000082';get diagnostics n=row_count;if n<>0 then raise exception 'Other match edited';end if;
  insert into public.club_match_calls(match_id,player_id) values('00000000-0000-0000-0000-000000000081',current_setting('test.player')::uuid);
  insert into public.club_attendance(training_id,player_id,present) values('00000000-0000-0000-0000-000000000081',current_setting('test.player')::uuid,true);
  update public.club_development set goals='Updated' where id='00000000-0000-0000-0000-000000000081';get diagnostics n=row_count;if n<>1 then raise exception 'Own development edit failed';end if;
  update public.club_development set goals='Forbidden' where id='00000000-0000-0000-0000-000000000082';get diagnostics n=row_count;if n<>0 then raise exception 'Other development edited';end if;
  begin perform public.club_assign_coach_teams(auth.uid(),array[current_setting('test.other_team')::uuid]);exception when raise_exception then denied=true;end;
  if not denied then raise exception 'Coach escalated access';end if;
  begin update public.profiles set role='admin' where id=auth.uid();raise exception 'Coach changed own role';exception when insufficient_privilege then null;end;
  begin insert into public.club_coach_teams values(auth.uid(),current_setting('test.other_team')::uuid);raise exception 'Direct permission insert accepted';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.admin'),'role','authenticated','app_metadata',jsonb_build_object('club_role','admin'))::text,true);
select public.club_assign_coach_teams(current_setting('test.coach')::uuid,'{}'::uuid[]);
-- Even a cached token claiming coach and the old team must not restore access.
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.coach'),'role','authenticated','app_metadata',jsonb_build_object('club_role','coach','club_team_ids',jsonb_build_array(current_setting('test.team'))))::text,true);
do $$declare n integer;begin
  if public.club_staff_team(current_setting('test.team')::uuid) then raise exception 'Revoked coach retained team access';end if;
  update public.trainings set location='After revocation' where id='00000000-0000-0000-0000-000000000081';get diagnostics n=row_count;if n<>0 then raise exception 'Revoked coach still edited';end if;
  if (select role from public.profiles where id=auth.uid())<>'parent' then raise exception 'Revoked role not reset';end if;
end $$;
select 'PASS: assigned team edits, invitations, attendance, development; other-team and privilege escalation denied; revocation immediate. All fixtures rolled back.' result;
rollback;
