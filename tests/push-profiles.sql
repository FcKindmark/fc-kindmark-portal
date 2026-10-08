begin;
select set_config('request.jwt.claims','{"app_metadata":{"club_role":"admin"}}',true);
select set_config('test.user',id::text,true),set_config('test.email',email,true) from auth.users where email is not null order by created_at limit 1;
select set_config('test.other',id::text,true) from auth.users where id<>current_setting('test.user')::uuid and email is not null order by created_at limit 1;
select set_config('test.player',gen_random_uuid()::text,true),set_config('test.otherplayer',gen_random_uuid()::text,true);
insert into public.players(id,name) values(current_setting('test.player')::uuid,'Push/profile test'),(current_setting('test.otherplayer')::uuid,'Other profile test');
insert into public.club_player_access(user_id,player_id) values(current_setting('test.user')::uuid,current_setting('test.player')::uuid);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.user'),'email',current_setting('test.email'),'app_metadata',jsonb_build_object('club_role','parent'))::text,true);
set local role authenticated;
do $$ declare row public.club_player_profiles;begin
 row:=public.club_save_player_profile(current_setting('test.player')::uuid,'+46 700123456','152',38.5,'@kindmark_test');
 if row.clothing_size<>'152' or row.telegram_username<>'kindmark_test' then raise exception 'Profile save failed';end if;
 begin perform public.club_save_player_profile(current_setting('test.otherplayer')::uuid,'+46 700123456','152',38.5,null);raise exception 'Cross-player write allowed';exception when raise_exception then if sqlerrm='Cross-player write allowed' then raise;end if;end;
 begin perform public.club_save_player_profile(current_setting('test.player')::uuid,'bad phone','unknown',999,null);raise exception 'Bad profile values accepted';exception when check_violation or numeric_value_out_of_range then null;end;
 if has_function_privilege('authenticated','public.club_push_config()','execute') then raise exception 'Push secret exposed';end if;
 if has_function_privilege('authenticated','public.club_claim_push()','execute') then raise exception 'Push dispatch exposed';end if;
end $$;
reset role;
insert into public.club_player_profiles(player_id,mobile) values(current_setting('test.otherplayer')::uuid,'0701234567');
insert into public.club_push_subscriptions(user_id,endpoint,p256dh,auth) values
(current_setting('test.user')::uuid,'https://fcm.googleapis.com/fcm/send/kindmark-test-own','test-key','test-auth'),
(current_setting('test.other')::uuid,'https://fcm.googleapis.com/fcm/send/kindmark-test-other','test-key','test-auth');
set local role authenticated;
do $$begin
 if (select count(*) from public.club_player_profiles where player_id in(current_setting('test.player')::uuid,current_setting('test.otherplayer')::uuid))<>1 then raise exception 'Profile read leaked';end if;
 if (select count(*) from public.club_push_subscriptions)<>1 then raise exception 'Subscription read leaked';end if;
 delete from public.club_push_subscriptions where user_id=current_setting('test.other')::uuid;
 if found then raise exception 'Cross-account unsubscribe allowed';end if;
end $$;
reset role;
select set_config('test.message',gen_random_uuid()::text,true);
insert into public.messages(id,recipient_email,subject,content) values(current_setting('test.message')::uuid,current_setting('test.email'),'Test','Test');
do $$declare job record;begin
 if(select count(*) from public.club_push_outbox where message_id=current_setting('test.message')::uuid)<>1 then raise exception 'Wrong push recipient';end if;
 select * into job from public.club_claim_push() where target_url like '%'||current_setting('test.message')||'%';
 if job.user_id<>current_setting('test.user')::uuid then raise exception 'Wrong job owner';end if;
 if job.target_url<>'/?family=messages&message='||current_setting('test.message') then raise exception 'Wrong deep link';end if;
 perform public.club_finish_push(job.job_id,gen_random_uuid(),204);
 if(select sent_at from public.club_push_outbox where id=job.job_id) is not null then raise exception 'Stale lease accepted';end if;
 perform public.club_finish_push(job.job_id,job.lease_id,204);
 if(select sent_at from public.club_push_outbox where id=job.job_id) is null then raise exception 'Delivery result not saved';end if;
end $$;
select 'PASS: own profile edit, cross-player denial, validated sizes/phone, private keys, own subscriptions, no cross-account removal, queued exact-recipient push, direct target and delivery leases; all fixtures rolled back' as result;
rollback;
