begin;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000077","role":"authenticated","app_metadata":{"club_role":"admin"}}',true);
set local role authenticated;
insert into public.club_membership_prices(year,new_amount,full_amount) values(extract(year from current_timestamp at time zone 'Europe/Stockholm')::integer,100,250) on conflict(year) do update set new_amount=100,full_amount=250;
insert into public.players(id,name,membership_category) values('00000000-0000-0000-0000-000000000081','Temporary full player','full'),('00000000-0000-0000-0000-000000000082','Temporary supporter player','supporter');
insert into public.club_member_cards(id,name,membership_type,fee_plan) values('00000000-0000-0000-0000-000000000083','Temporary full member','member','full'),('00000000-0000-0000-0000-000000000084','Temporary new member','member','new');
do $$ begin
 if not exists(select 1 from public.payments where player_id='00000000-0000-0000-0000-000000000081' and amount=250) then raise exception 'Full player fee incorrect'; end if;
 if not exists(select 1 from public.payments where player_id='00000000-0000-0000-0000-000000000082' and amount=150) then raise exception 'Supporter player fee incorrect'; end if;
 if not exists(select 1 from public.payments where member_id='00000000-0000-0000-0000-000000000083' and amount=250) then raise exception 'Full adult fee incorrect'; end if;
 if not exists(select 1 from public.payments where member_id='00000000-0000-0000-0000-000000000084' and amount=100) then raise exception 'New adult fee incorrect'; end if;
end $$;
select 'PASS: member category selected at creation controls full/new prices and fixed supporter fee, for players and other members' result;
rollback;
