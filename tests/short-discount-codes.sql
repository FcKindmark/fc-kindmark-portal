begin;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id::text from auth.users where raw_app_meta_data->>'club_role'='admin' limit 1),'role','authenticated','app_metadata',jsonb_build_object('club_role','admin'))::text,true);
set local role authenticated;
insert into public.club_member_cards(id,name,status,member_number)
values('00000000-0000-0000-0000-000000000081','Short code test','inactive','FCK-IGNORED'),
('00000000-0000-0000-0000-000000000082','Second short code test','inactive','FCK-IGNORED');
do $$begin
 if exists(select 1 from public.club_member_cards where member_number<>'FCK-'||membership_no::text) then raise exception 'Discount code not derived from short membership number';end if;
 if (select count(distinct member_number) from public.club_member_cards where id in ('00000000-0000-0000-0000-000000000081','00000000-0000-0000-0000-000000000082'))<>2 then raise exception 'New cards received duplicate codes';end if;
end $$;
update public.club_member_cards set member_number='FCK-TOO-LONG-OVERRIDE' where id='00000000-0000-0000-0000-000000000081';
do $$begin
 if exists(select 1 from public.club_member_cards where id='00000000-0000-0000-0000-000000000081' and member_number<>'FCK-'||membership_no::text) then raise exception 'Short code invariant lost on update';end if;
end $$;
select 'PASS: existing and new cards use unique short FCK codes; updates preserve the stable code. Test cards rolled back.' result;
rollback;
