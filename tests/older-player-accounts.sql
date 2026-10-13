-- Regression test runs entirely in a rollback-only transaction; no invites or emails.
begin;
do $$begin
 perform set_config('test.admin',(select id::text from auth.users where raw_app_meta_data->>'club_role'='admin' limit 1),true);
 perform set_config('test.account',(select p.id::text from public.profiles p join auth.users u on u.id=p.id where p.role='parent' and coalesce(u.raw_app_meta_data->>'club_role','parent')<>'admin' order by p.id limit 1),true);
 perform set_config('test.player',(select id::text from public.players where birth_year<=2012 and team_id is not null order by id limit 1),true);
 perform set_config('test.other',(select id::text from public.players where birth_year<=2012 and id<>current_setting('test.player')::uuid order by id limit 1),true);
 perform set_config('test.young',(select id::text from public.players where birth_year>2012 order by id limit 1),true);
 if nullif(current_setting('test.account'),'') is null then raise exception 'No non-staff test identity exists';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.admin'),'role','authenticated','app_metadata',jsonb_build_object('club_role','admin'))::text,true);
end $$;
-- The profile and links are isolated only inside this transaction and restored by rollback.
update public.profiles set email='player-access-regression-'||id::text||'@example.invalid' where id=current_setting('test.account')::uuid;
set local role authenticated;
delete from public.club_player_access where user_id=current_setting('test.account')::uuid;
do $$declare denied boolean=false;begin
 begin perform public.club_link_player_account(current_setting('test.account')::uuid,current_setting('test.young')::uuid,true);exception when raise_exception then denied=position('2012' in sqlerrm)>0;end;
 if not denied then raise exception '2013-or-younger account was not rejected';end if;
end $$;
select public.club_link_player_account(current_setting('test.account')::uuid,current_setting('test.player')::uuid,true);
select public.club_link_player_account(current_setting('test.account')::uuid,current_setting('test.player')::uuid,true);
do $$declare denied boolean=false;begin
 begin perform public.club_link_player_account(current_setting('test.account')::uuid,current_setting('test.other')::uuid,true);exception when raise_exception then denied=true;end;
 if not denied then raise exception 'Second-player account link allowed';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.account'),'role','authenticated','app_metadata',jsonb_build_object('club_role','parent'))::text,true);
end $$;
do $$declare denied boolean=false;n integer;begin
 if (select role from public.profiles where id=auth.uid())<>'player' then raise exception 'Own player role missing';end if;
 if (select count(*) from public.players)<>1 then raise exception 'Player can see other players';end if;
 if not exists(select 1 from public.club_member_cards where player_id=current_setting('test.player')::uuid) then raise exception 'Own membership card not visible';end if;
 if exists(select 1 from public.club_member_cards where player_id=current_setting('test.other')::uuid) then raise exception 'Other membership card visible';end if;
 if not exists(select 1 from public.teams) then raise exception 'Own team not visible';end if;
 if public.club_staff_team((select team_id from public.players where id=current_setting('test.player')::uuid)) then raise exception 'Player received staff access';end if;
 update public.players set name='Forbidden' where id=current_setting('test.player')::uuid;get diagnostics n=row_count;if n<>0 then raise exception 'Player can edit roster';end if;
 begin perform public.club_link_player_account(auth.uid(),current_setting('test.other')::uuid,true);exception when raise_exception then denied=true;end;
 if not denied then raise exception 'Player can self-grant access';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.admin'),'role','authenticated','app_metadata',jsonb_build_object('club_role','admin'))::text,true);
end $$;
select public.club_link_player_account(current_setting('test.account')::uuid,current_setting('test.player')::uuid,false);
-- Validate guardian-address refusal without ever converting a real guardian persistently.
reset role;
update public.players set mother_email=(select email from public.profiles where id=current_setting('test.account')::uuid) where id=current_setting('test.other')::uuid;
set local role authenticated;
do $$declare denied boolean=false;begin
 begin perform public.club_link_player_account(current_setting('test.account')::uuid,current_setting('test.player')::uuid,true);exception when raise_exception then denied=position('föräldrakonto' in sqlerrm)>0;end;
 if not denied then raise exception 'Guardian address accepted as own player account';end if;
end $$;
select 'PASS: eligibility; guardian refusal; own profile/card/team; no other-player visibility, roster writes, staff permissions or self-grants. All test changes rolled back.' as result;
rollback;
