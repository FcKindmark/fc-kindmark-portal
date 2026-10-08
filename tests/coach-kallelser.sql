begin;
do $$declare a record;b record;begin
 select p.id,u.email into a from public.profiles p join auth.users u on u.id=p.id where u.email is not null order by u.created_at limit 1;
 select p.id,u.email into b from public.profiles p join auth.users u on u.id=p.id where p.id<>a.id and u.email is not null order by u.created_at limit 1;
 perform set_config('test.coach',a.id::text,true);perform set_config('test.email',a.email,true);perform set_config('test.other',b.id::text,true);
 perform set_config('test.team',gen_random_uuid()::text,true);perform set_config('test.training',gen_random_uuid()::text,true);perform set_config('test.match',gen_random_uuid()::text,true);perform set_config('test.player',gen_random_uuid()::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a.id,'email',a.email,'app_metadata',jsonb_build_object('club_role','admin'))::text,true);
 insert into public.teams(id,name) values(current_setting('test.team')::uuid,'Coach call verification');
 insert into public.players(id,name,team_id) values(current_setting('test.player')::uuid,'Fixture player',current_setting('test.team')::uuid);
 insert into public.trainings(id,date,time,end_time,team_id) values(current_setting('test.training')::uuid,current_date+1,'18:00','19:00',current_setting('test.team')::uuid);
 insert into public.matches(id,date,opponent,team_id) values(current_setting('test.match')::uuid,current_date+2,'Fixture opponent',current_setting('test.team')::uuid);
 insert into public.club_coach_teams(user_id,team_id) values(a.id,current_setting('test.team')::uuid),(b.id,current_setting('test.team')::uuid);
end $$;
set local role authenticated;
do $$declare result jsonb;begin
 result:=public.club_send_training_call(current_setting('test.training')::uuid,array[current_setting('test.player')::uuid],'Test');
 if (result->>'coaches')::int<>2 or (result->>'recipients')::int<>2 then raise exception 'Missing mandatory coach invitations/messages';end if;
 perform public.club_reply_coach_call('training',current_setting('test.training')::uuid,true);
 result:=public.club_send_training_call(current_setting('test.training')::uuid,array[current_setting('test.player')::uuid],'Updated note');
 if not(select attending from public.club_coach_calls where event_id=current_setting('test.training')::uuid and coach_id=current_setting('test.coach')::uuid) then raise exception 'Resend erased coach answer';end if;
 perform public.club_send_match_call(current_setting('test.match')::uuid,array[current_setting('test.player')::uuid],'Test');
 if jsonb_array_length(public.club_coach_invitations())<>2 then raise exception 'Own invitations missing';end if;
 if (select count(*) from public.club_event_coach_responses('training',current_setting('test.training')::uuid))<>2 then raise exception 'Team response summary missing';end if;
 if (select count(*) from public.club_message_targets() where event_id in(current_setting('test.training')::uuid,current_setting('test.match')::uuid))<>2 then raise exception 'Coach direct notification targets missing';end if;
end $$;
reset role;
do $$begin perform set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.other'),'app_metadata',jsonb_build_object('club_role','coach'))::text,true);end $$;
set local role authenticated;
do $$begin
 perform public.club_reply_coach_call('training',current_setting('test.training')::uuid,false);
 if not(select attending from public.club_coach_calls where event_id=current_setting('test.training')::uuid and coach_id=current_setting('test.coach')::uuid) then raise exception 'Other coach answer changed';end if;
 if(select attending from public.club_coach_calls where event_id=current_setting('test.training')::uuid and coach_id=current_setting('test.other')::uuid) is distinct from false then raise exception 'Kommer inte did not save';end if;
end $$;
reset role;
delete from public.club_coach_teams where user_id=current_setting('test.other')::uuid and team_id=current_setting('test.team')::uuid;
set local role authenticated;
do $$begin
 begin perform public.club_reply_coach_call('training',current_setting('test.training')::uuid,true);raise exception 'Revoked coach still replied';exception when raise_exception then if sqlerrm='Revoked coach still replied' then raise;end if;end;
 if jsonb_array_length(public.club_coach_invitations())<>0 then raise exception 'Revoked assignment still exposed invitations';end if;
 if(select count(*) from public.club_coach_calls where event_id=current_setting('test.training')::uuid)<>0 then raise exception 'Revoked coach can read team responses';end if;
end $$;
reset role;
rollback;
select 'PASS: mandatory coaches in training and match calls, own RSVP and false answers, preserved replies, direct message targets and revoked-team denial; fixtures rolled back' as result;
