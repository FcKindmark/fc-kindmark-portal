begin;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000077","role":"authenticated","app_metadata":{"club_role":"admin"}}',true);
insert into public.club_member_cards(id,name,membership_type,user_id) values('00000000-0000-0000-0000-000000000099','Temporary supporter test','supporter',(select id from auth.users where email='info@fckindmark.se' limit 1));
set local role authenticated;
do $$ begin
 if not exists(select 1 from public.payments where member_id='00000000-0000-0000-0000-000000000099' and amount=150 and status='pending' and player_id is null) then raise exception 'Automatic supporter fee missing'; end if;
 if public.club_create_member_fee('00000000-0000-0000-0000-000000000099',extract(year from current_timestamp at time zone 'Europe/Stockholm')::integer) then raise exception 'Duplicate supporter fee'; end if;
 begin
 update public.payments set amount=200 where member_id='00000000-0000-0000-0000-000000000099';
 raise exception 'Wrong amount accepted';
 exception when raise_exception then if sqlerrm<>'Stödmedlemsavgiften är alltid 150 SEK' then raise; end if; end;
end $$;
select set_config('request.jwt.claims',json_build_object('sub',user_id,'role','authenticated','app_metadata',json_build_object('club_role','parent'))::text,true) from public.club_member_cards where id='00000000-0000-0000-0000-000000000099';
do $$ declare changed integer; begin
 if not exists(select 1 from public.payments where member_id='00000000-0000-0000-0000-000000000099' and amount=150) then raise exception 'Owner cannot read own fee'; end if;
 update public.payments set status='paid' where member_id='00000000-0000-0000-0000-000000000099';get diagnostics changed=row_count;
 if changed<>0 then raise exception 'Member changed payment'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000077","role":"authenticated","app_metadata":{"club_role":"parent"}}',true);
do $$ begin if exists(select 1 from public.payments where member_id='00000000-0000-0000-0000-000000000099') then raise exception 'Other member can read fee'; end if; end $$;
select 'PASS: supporter fee is automatically 150 SEK, duplicate blocked, price fixed, owner can read but not edit, other users cannot read' result;
rollback;
