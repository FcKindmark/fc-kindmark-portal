begin;
select set_config('test.admin',(select id::text from auth.users where raw_app_meta_data->>'club_role'='admin' limit 1),true);
select set_config('test.account',(select p.id::text from public.profiles p join auth.users u on u.id=p.id where p.role='parent' and coalesce(u.raw_app_meta_data->>'club_role','parent')<>'admin' order by p.id limit 1),true);
select set_config('test.player',(select id::text from public.players where team_id is not null order by id limit 1),true);
select set_config('test.other_player',(select id::text from public.players where team_id is not null and id<>current_setting('test.player')::uuid order by id limit 1),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.admin'),'role','authenticated','app_metadata',jsonb_build_object('club_role','admin'))::text,true);
set local role authenticated;
do $$declare denied boolean=false;begin
 if (select count(*) from public.club_player_access where user_id=current_setting('test.account')::uuid)>1 then
  begin perform public.club_link_player_account(current_setting('test.account')::uuid,current_setting('test.player')::uuid,true);exception when raise_exception then denied=true;end;
  if not denied then raise exception 'Multi-child guardian account converted to player';end if;
 end if;
end $$;
-- Isolate the test identity within this rollback-only transaction.
delete from public.club_player_access where user_id=current_setting('test.account')::uuid;
select public.club_link_player_account(current_setting('test.account')::uuid,current_setting('test.player')::uuid,true);
select public.club_link_player_account(current_setting('test.account')::uuid,current_setting('test.player')::uuid,true);
do $$declare denied boolean=false;begin
 begin insert into public.club_player_access(user_id,player_id) values(current_setting('test.account')::uuid,current_setting('test.other_player')::uuid);exception when raise_exception then denied=true;end;
 if not denied then raise exception 'Player account linked to another player';end if;
 denied=false;
 begin perform public.club_link_player_account(current_setting('test.account')::uuid,current_setting('test.other_player')::uuid,true);exception when raise_exception then denied=true;end;
 if not denied then raise exception 'Player account reassigned without unlinking';end if;
 denied=false;
 begin perform public.club_link_player_account(current_setting('test.admin')::uuid,current_setting('test.player')::uuid,true);exception when raise_exception then denied=true;end;
 if not denied then raise exception 'Admin account changed to player';end if;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.account'),'role','authenticated','app_metadata',jsonb_build_object('club_role','parent'))::text,true);
do $$declare denied boolean=false;n integer;begin
 if (select role from public.profiles where id=auth.uid())<>'player' then raise exception 'Player role missing';end if;
 if (select count(*) from public.players)<>1 or not exists(select 1 from public.players where id=current_setting('test.player')::uuid) then raise exception 'Wrong player profile visibility';end if;
 if not exists(select 1 from public.club_member_cards where player_id=current_setting('test.player')::uuid) then raise exception 'Own card inaccessible';end if;
 if exists(select 1 from public.club_member_cards where player_id=current_setting('test.other_player')::uuid) then raise exception 'Other player card visible';end if;
 if not exists(select 1 from public.teams) then raise exception 'Own team invisible';end if;
 if public.club_staff_team((select team_id from public.players where id=current_setting('test.player')::uuid)) then raise exception 'Player gained coach access';end if;
 update public.players set name='Forbidden' where id=current_setting('test.player')::uuid;get diagnostics n=row_count;if n<>0 then raise exception 'Player edited roster';end if;
 begin perform public.club_link_player_account(auth.uid(),current_setting('test.other_player')::uuid,true);exception when raise_exception then denied=true;end;
 if not denied then raise exception 'Player granted own access';end if;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.admin'),'role','authenticated','app_metadata',jsonb_build_object('club_role','admin'))::text,true);
select public.club_link_player_account(current_setting('test.account')::uuid,current_setting('test.player')::uuid,false);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.account'),'role','authenticated','app_metadata',jsonb_build_object('club_role','parent'))::text,true);
do $$begin
 if exists(select 1 from public.players) then raise exception 'Unlinked account retained player access';end if;
 if (select role from public.profiles where id=auth.uid())<>'parent' then raise exception 'Player role not reset';end if;
end $$;
select 'PASS: player login reads only own profile/card/team; no staff writes or self-granted access; second-player linking refused; revocation immediate. Tests rolled back.' result;
rollback;
