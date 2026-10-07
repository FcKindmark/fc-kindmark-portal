begin;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000077","role":"authenticated","app_metadata":{"club_role":"admin"}}',true);
set local role authenticated;
insert into public.club_membership_prices(year,new_amount,full_amount) values(extract(year from current_timestamp at time zone 'Europe/Stockholm')::integer,150,300) on conflict(year) do update set new_amount=150,full_amount=300;
insert into public.players(id,name) values('00000000-0000-0000-0000-000000000098','Temporary automatic member test');
do $$ declare m uuid; y integer:=extract(year from current_timestamp at time zone 'Europe/Stockholm')::integer; begin
 select id into m from public.club_member_cards where player_id='00000000-0000-0000-0000-000000000098';
 if m is null then raise exception 'Automatic card missing'; end if;
 if not exists(select 1 from public.payments where member_id=m and membership_year=y and amount=150 and status='pending' and reference=membership_no::text||'-'||y) then raise exception 'Automatic fee missing'; end if;
 if public.club_create_member_fee(m,y) then raise exception 'Duplicate fee created'; end if;
 if not public.club_set_member_fee_plan(m,'full',y) then raise exception 'Category change failed'; end if;
 if not exists(select 1 from public.payments where member_id=m and amount=300) then raise exception 'Full price not applied'; end if;
 update public.payments set status='paid',paid_date=current_date,paid_reference='BANK-TEST' where member_id=m;
 perform public.club_set_member_fee_plan(m,'new',y);
 if not exists(select 1 from public.payments where member_id=m and amount=300 and status='paid') then raise exception 'Paid fee changed'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000077","role":"authenticated","app_metadata":{"club_role":"parent"}}',true);
do $$ begin
 begin
 perform public.club_generate_member_fees(2026);
 raise exception 'Parent generated fees';
 exception when insufficient_privilege then null; end;
end $$;
select 'PASS: automatic card and annual fee; no duplicate; category changes pending price; paid amount preserved; parent denied' result;
rollback;
