begin;
do $$declare uid uuid;tid uuid:=gen_random_uuid();pid uuid:=gen_random_uuid();details jsonb;result public.players;begin
 select id into uid from auth.users order by created_at limit 1;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'email','fixture@fckindmark.se','app_metadata',jsonb_build_object('club_role','admin'))::text,true);
 insert into public.teams(id,name) values(tid,'Profile verification');
 insert into public.players(id,name,team_id,sport_id) values(pid,'Original fixture',tid,'fixture-reference');
 perform set_config('test.player_id',pid::text,true);
 perform set_config('test.team_id',tid::text,true);
end $$;
set local role authenticated;
do $$declare pid uuid:=current_setting('test.player_id')::uuid;tid uuid:=current_setting('test.team_id')::uuid;details jsonb;result public.players;begin
 details:=jsonb_build_object('name','Updated fixture','birth_year',2014,'number',9,'gender','boy','team_id',tid,'position','Forward','membership_category','full','email',' CHILD@Example.com ','mother_name','Parent One','mother_phone','+46 70 123 45 67','mother_email',' Parent@One.example ','father_name','Parent Two','father_phone','070-7654321','father_email','other@two.example','mobile','0701234567','clothing_size','164','shoe_size',39.5,'telegram_username','@fixture_name');
 result:=public.club_admin_save_player_details(pid,details);
 if result.name<>'Updated fixture' or result.email<>'child@example.com' or result.mother_email<>'parent@one.example' or result.father_phone<>'070-7654321' or result.sport_id<>'fixture-reference' then raise exception 'Contact update or preserved identifiers failed';end if;
 if not exists(select 1 from public.club_player_profiles where player_id=pid and mobile='0701234567' and clothing_size='164' and shoe_size=39.5 and telegram_username='fixture_name') then raise exception 'Equipment profile was not saved';end if;
 begin
  perform public.club_admin_save_player_details(pid,details||'{"name":"Must roll back","clothing_size":"INVALID"}'::jsonb);
  raise exception 'Invalid clothing accepted';
 exception when check_violation then null;
 end;
 if (select name from public.players where id=pid)<>'Updated fixture' then raise exception 'Atomic rollback failed';end if;
 result:=public.club_admin_save_player_details(pid,details||'{"team_id":"","mother_phone":""}'::jsonb);
 if result.team_id is not null or result.mother_phone is not null then raise exception 'Clear team/contact failed';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',auth.uid(),'app_metadata',jsonb_build_object('club_role','coach'),'user_metadata',jsonb_build_object('club_role','admin'))::text,true);
 begin
  perform public.club_admin_save_player_details(pid,details);
  raise exception 'Non-admin could edit';
 exception when raise_exception then if sqlerrm='Non-admin could edit' then raise;end if;
 end;
end $$;
rollback;
select 'PASS: authenticated admin saves player, parents, team and equipment atomically; invalid sizes roll back; team/contact clearing works; non-admin and user metadata escalation rejected; fixtures rolled back.' as result;
