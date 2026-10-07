begin;
select set_config('test.admin',(select id::text from auth.users where raw_app_meta_data->>'club_role'='admin' limit 1),true);
select set_config('test.coach',(select p.id::text from public.profiles p where p.role<>'coach' and p.id<>current_setting('test.admin')::uuid order by p.id limit 1),true);
select set_config('test.team',(select id::text from public.teams order by id limit 1),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.admin'),'role','authenticated','app_metadata',jsonb_build_object('club_role','admin'))::text,true);
set local role authenticated;
select public.club_assign_coach_teams(current_setting('test.coach')::uuid,array[current_setting('test.team')::uuid]);
select public.club_assign_coach_teams(current_setting('test.coach')::uuid,array[current_setting('test.team')::uuid]);
do $$begin
 if (select count(*) from public.club_member_cards where user_id=current_setting('test.coach')::uuid and player_id is null and membership_type='supporter')<>1 then raise exception 'Coach card missing or duplicated';end if;
 if (select count(*) from public.payments pay join public.club_member_cards c on c.id=pay.member_id where c.user_id=current_setting('test.coach')::uuid and c.player_id is null and pay.amount=150 and pay.payment_kind='membership')<>1 then raise exception 'Coach fee missing or duplicated';end if;
end $$;
select public.club_assign_coach_teams(current_setting('test.coach')::uuid,'{}'::uuid[]);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.coach'),'role','authenticated','app_metadata',jsonb_build_object('club_role','parent'))::text,true);
do $$begin
 if not exists(select 1 from public.club_member_cards where user_id=auth.uid() and membership_type='supporter') then raise exception 'Supporter membership lost after coach removal';end if;
 if not exists(select 1 from public.payments pay join public.club_member_cards c on c.id=pay.member_id where c.user_id=auth.uid() and pay.amount=150) then raise exception 'Own supporter fee unreadable';end if;
 if public.club_staff_team(current_setting('test.team')::uuid) then raise exception 'Coach rights survived removal';end if;
end $$;
select 'PASS: coach promotion creates one supporter card and one 150 SEK fee; repeated assignment is idempotent; membership survives coaching revocation; own fee readable.' result;
rollback;
