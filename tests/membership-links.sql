begin;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000077","role":"authenticated","app_metadata":{"club_role":"admin"}}',true);
set local role authenticated;
insert into public.club_member_cards(id,name) values('00000000-0000-0000-0000-000000000096','Temporary membership test');
insert into public.payments(id,player_name,amount,status,payment_kind,membership_year,member_id,membership_no,paid_date,paid_reference,payer_name,bank_message,reference)
select '00000000-0000-0000-0000-000000000097',name,150,'paid','membership',2026,id,membership_no,'2026-10-07','BANK-TEST','Guardian Test','Original Member Name',membership_no::text||'-2026' from public.club_member_cards where id='00000000-0000-0000-0000-000000000096';
do $$ begin
 if not exists(select 1 from public.payments where id='00000000-0000-0000-0000-000000000097' and membership_no>=1001 and paid_reference='BANK-TEST' and bank_message='Original Member Name') then raise exception 'Link or receipt metadata missing'; end if;
 delete from public.club_member_cards where id='00000000-0000-0000-0000-000000000096';
 if not exists(select 1 from public.payments where id='00000000-0000-0000-0000-000000000097' and member_id is null and membership_no>=1001 and paid_reference='BANK-TEST') then raise exception 'Historical payment was not preserved'; end if;
end $$;
select 'PASS: admin receives automatic unique member number, links payment and preserves receipt data after card deletion' result;
rollback;
