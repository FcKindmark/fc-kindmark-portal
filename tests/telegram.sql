begin;
do $$declare a record;b record;begin
 select p.id,u.email into a from public.profiles p join auth.users u on u.id=p.id where u.email is not null order by u.created_at limit 1;
 select p.id,u.email into b from public.profiles p join auth.users u on u.id=p.id where p.id<>a.id and u.email is not null order by u.created_at limit 1;
 perform set_config('test.uid',a.id::text,true);perform set_config('test.other',b.id::text,true);
 perform set_config('test.team',gen_random_uuid()::text,true);perform set_config('test.training',gen_random_uuid()::text,true);perform set_config('test.match',gen_random_uuid()::text,true);perform set_config('test.player',gen_random_uuid()::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a.id,'email',a.email,'app_metadata',jsonb_build_object('club_role','admin'))::text,true);
 insert into public.teams(id,name) values(current_setting('test.team')::uuid,'Telegram verification');
 insert into public.players(id,name,team_id,mother_email) values(current_setting('test.player')::uuid,'Fixture player',current_setting('test.team')::uuid,a.email);
 insert into public.trainings(id,date,time,end_time,team_id) values(current_setting('test.training')::uuid,current_date+1,'18:00','19:00',current_setting('test.team')::uuid);
 insert into public.matches(id,date,time,opponent,team_id) values(current_setting('test.match')::uuid,current_date+2,'18:00','Fixture opponent',current_setting('test.team')::uuid);
 insert into public.club_coach_teams(user_id,team_id) values(a.id,current_setting('test.team')::uuid),(b.id,current_setting('test.team')::uuid);
 perform public.club_telegram_issue(a.id,repeat('f',64));
 if public.club_telegram_update(9000000000001,900000000001,'start',repeat('f',64),null,null) not like 'Välkommen%' then raise exception 'Link failed';end if;
 if public.club_telegram_update(9000000000002,900000000002,'start',repeat('f',64),null,null) not like 'Länken har gått%' then raise exception 'Token reused';end if;
 perform public.club_telegram_issue(b.id,repeat('b',64));
 if public.club_telegram_update(9000000000003,900000000001,'start',repeat('b',64),null,null) not like 'Detta Telegram%' then raise exception 'Chat ownership stolen';end if;
end $$;
set local role authenticated;
do $$begin
 begin perform public.club_telegram_config();raise exception 'Credentials readable by member';exception when insufficient_privilege then null;end;
 begin perform public.club_telegram_issue(current_setting('test.uid')::uuid,repeat('c',64));raise exception 'Member can impersonate another user';exception when insufficient_privilege then null;end;
 perform public.club_send_training_call(current_setting('test.training')::uuid,array[current_setting('test.player')::uuid],'Telegram test');
 perform public.club_send_match_call(current_setting('test.match')::uuid,array[current_setting('test.player')::uuid],'Telegram test');
end $$;
reset role;
do $$declare q record;payload jsonb;aid uuid;msg text;begin
 for q in select o.id as job_id,public.club_telegram_payload(o.id) as payload from public.club_telegram_outbox o
 where o.user_id=current_setting('test.uid')::uuid and
 (exists(select 1 from public.club_training_notices n where n.message_id=o.message_id and n.training_id=current_setting('test.training')::uuid)
 or exists(select 1 from public.club_match_notices n where n.message_id=o.message_id and n.match_id=current_setting('test.match')::uuid)) loop
 payload:=q.payload;
 if jsonb_array_length(payload->'reply_markup'->'inline_keyboard')<>2 then raise exception 'Child and coach buttons missing';end if;
 if payload->>'text' like '%Öppna Kallelser i portalen%' or payload::text like '%Öppna i medlemsportalen%' then raise exception 'Invitation incorrectly redirects to portal';end if;

 end loop;
 select id into aid from public.club_telegram_actions where kind='training' and event_id=current_setting('test.training')::uuid and not staff;
 perform set_config('test.action',aid::text,true);
 msg:=public.club_telegram_update(9000000000004,900000000001,'reply',null,aid,true);
 if msg not like '%Kommer ✅%' then raise exception 'Player reply failed: %',msg;end if;
 if not(select attended from public.training_attendance where training_id=current_setting('test.training')::uuid and player_id=current_setting('test.player')::uuid) then raise exception 'Player RSVP absent';end if;
 if public.club_telegram_update(9000000000004,900000000001,'reply',null,aid,false) is not null then raise exception 'Duplicate update processed';end if;
 if not(select attended from public.training_attendance where training_id=current_setting('test.training')::uuid and player_id=current_setting('test.player')::uuid) then raise exception 'Replay altered RSVP';end if;
 perform public.club_telegram_update(9000000000005,900000000001,'reply',null,aid,false);
 if(select attended from public.training_attendance where training_id=current_setting('test.training')::uuid and player_id=current_setting('test.player')::uuid) is distinct from false then raise exception 'Player no not saved';end if;
 select id into aid from public.club_telegram_actions where kind='match' and event_id=current_setting('test.match')::uuid and staff and target_id=current_setting('test.uid')::uuid;
 msg:=public.club_telegram_update(9000000000006,900000000001,'reply',null,aid,true);
 if msg not like '%Kommer ✅%' then raise exception 'Coach RSVP failed: %',msg;end if;
 if not(select attending from public.club_coach_calls where event_kind='match' and event_id=current_setting('test.match')::uuid and coach_id=current_setting('test.uid')::uuid) then raise exception 'Coach reply absent';end if;
 select id into aid from public.club_telegram_actions where kind='match' and event_id=current_setting('test.match')::uuid and not staff;
 msg:=public.club_telegram_update(9000000000007,900000000001,'reply',null,aid,false);
 if msg not like '%Kommer inte ❌%' then raise exception 'Match RSVP failed: %',msg;end if;
 if(select attending from public.club_match_replies where match_id=current_setting('test.match')::uuid and player_id=current_setting('test.player')::uuid) is distinct from false then raise exception 'Match reply absent';end if;
 -- Another linked user cannot use this private action.
 perform public.club_telegram_update(9000000000008,900000000002,'start',repeat('b',64),null,null);
 if public.club_telegram_update(9000000000009,900000000002,'reply',null,aid,true) not like 'Kallelsen är inte%' then raise exception 'Cross-user action allowed';end if;
 -- A revoked team assignment cannot reuse a coach button.
 delete from public.club_coach_teams where user_id=current_setting('test.uid')::uuid and team_id=current_setting('test.team')::uuid;
 select id into aid from public.club_telegram_actions where kind='match' and event_id=current_setting('test.match')::uuid and staff and target_id=current_setting('test.uid')::uuid;
 if public.club_telegram_update(9000000000010,900000000001,'reply',null,aid,false) not like 'Du är inte längre%' then raise exception 'Revoked coach replied';end if;
 -- Removed call and expired event cannot be answered.
 aid:=current_setting('test.action')::uuid;
 delete from public.club_training_calls where training_id=current_setting('test.training')::uuid;
 if public.club_telegram_update(9000000000011,900000000001,'reply',null,aid,true) not like 'Spelaren är inte längre%' then raise exception 'Removed call replied';end if;
 update public.trainings set date=current_date-1 where id=current_setting('test.training')::uuid;
 if public.club_telegram_update(9000000000012,900000000001,'reply',null,aid,true) not like 'Aktiviteten har börjat%' then raise exception 'Expired activity replied';end if;
 perform public.club_telegram_update(9000000000013,900000000001,'stop',null,null,null);
 if exists(select 1 from public.club_telegram_links where user_id=current_setting('test.uid')::uuid) or exists(select 1 from public.club_telegram_outbox where user_id=current_setting('test.uid')::uuid) then raise exception 'Opt-out did not remove deliveries';end if;
end $$;
rollback;
select 'PASS Telegram: single-use linking, credential isolation, children/coaches, real RSVP tables, update deduplication, cross-account denial, revoked coach/call checks, event expiry and disconnect cleanup; fixtures rolled back' as result;
