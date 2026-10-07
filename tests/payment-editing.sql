begin;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000077","role":"authenticated","app_metadata":{"club_role":"admin"}}',true);
set local role authenticated;
insert into public.payments(id,player_name,amount,status,due_date,reference) values('00000000-0000-0000-0000-000000000095','Temporary payment test',150.50,'pending','2026-10-10','TEST');
do $$ begin
 update public.payments set amount=200.75,description='Updated test',status='paid',paid_date='2026-10-08' where id='00000000-0000-0000-0000-000000000095';
 if not exists(select 1 from public.payments where id='00000000-0000-0000-0000-000000000095' and amount=200.75 and status='paid' and paid_date='2026-10-08' and due_date='2026-10-10') then raise exception 'Payment edit failed'; end if;
 begin
  update public.payments set amount=-1 where id='00000000-0000-0000-0000-000000000095';
  raise exception 'Negative amount accepted';
 exception when check_violation then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000077","role":"authenticated","app_metadata":{"club_role":"parent"}}',true);
do $$ declare changed integer; begin
 update public.payments set amount=1 where id='00000000-0000-0000-0000-000000000095';
 get diagnostics changed=row_count; if changed<>0 then raise exception 'Non-admin updated payment'; end if;
 delete from public.payments where id='00000000-0000-0000-0000-000000000095';
 get diagnostics changed=row_count; if changed<>0 then raise exception 'Non-admin deleted payment'; end if;
 begin
 insert into public.payments(player_name,amount,status) values('Unauthorized test',150,'pending');
 raise exception 'Non-admin inserted payment';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000077","role":"authenticated","app_metadata":{"club_role":"admin"}}',true);
do $$ declare changed integer; begin
 delete from public.payments where id='00000000-0000-0000-0000-000000000095';
 get diagnostics changed=row_count; if changed<>1 then raise exception 'Admin deletion failed'; end if;
end $$;
select 'PASS: admin creates, edits and deletes; invalid amount rejected; parent writes denied' as result;
rollback;
