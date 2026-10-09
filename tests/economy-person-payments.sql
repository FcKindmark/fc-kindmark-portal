begin; set local role authenticated;
select set_config('request.jwt.claims','{"sub":"464a9f89-ae01-4c5a-98f1-5984354118d8","app_metadata":{"club_role":"admin"}}',true);
do $$declare b uuid;e uuid;p uuid;m uuid;payload jsonb;caught boolean;begin
select id into p from public.players order by id limit 1;
select id into m from public.club_member_cards order by id limit 1;
if p is null or m is null then raise exception 'Test person unavailable';end if;
insert into public.club_econ_bank(date,amount,description,fingerprint,import_name) values('2098-02-01',990,'TEST net','test-'||gen_random_uuid(),'TEST') returning id into b;
payload:=jsonb_build_object('date','2098-02-01','description','TEST persons','bank_id',b,'bank_fee',10,'income_allocations',jsonb_build_array(jsonb_build_object('category','cup','amount',500,'player_id',p,'note','TEST cup'),jsonb_build_object('category','cup','amount',500,'member_id',m)),'lines','[{"account":"1930","debit":990,"credit":0},{"account":"6570","debit":10,"credit":0},{"account":"3904","debit":0,"credit":1000}]'::jsonb);
e:=public.club_econ_entry('save',payload);
if not exists(select 1 from public.club_econ_settlement_selections where journal_id=e and bank_fee=10 and income_allocations->0->>'person_name' is not null and income_allocations->1->>'member_id'=m::text) then raise exception 'Person draft missing';end if;
e:=public.club_econ_entry('post',payload||jsonb_build_object('id',e));
perform public.club_econ_entry('reverse',jsonb_build_object('id',e,'date','2098-02-01','reason','TEST'));
if (select sum(l.debit-l.credit) from public.club_econ_lines l join public.club_econ_journal j on j.id=l.journal_id where j.bank_id=b and j.status='posted' and l.account='6570')<>0 then raise exception 'Fee reversal incorrect';end if;
caught:=false;begin perform public.club_econ_entry('post',payload||jsonb_build_object('income_allocations',jsonb_build_array(jsonb_build_object('category','cup','amount',1000,'player_id',gen_random_uuid()))));exception when others then caught:=true;end;if not caught then raise exception 'Invalid player accepted';end if;
insert into public.club_econ_bank(date,amount,description,fingerprint,import_name) values('2098-02-02',-25,'TEST fee','test-'||gen_random_uuid(),'TEST') returning id into b;
perform public.club_econ_entry('post',jsonb_build_object('date','2098-02-02','description','TEST fee','bank_id',b,'bank_fee',25,'lines','[{"account":"1930","debit":0,"credit":25},{"account":"6570","debit":25,"credit":0}]'::jsonb));
end $$;
select 'PASS: two person-linked cup payments, net fee, saved payer names, reversal, invalid player rejection and standalone bank fee; fixtures rolled back' result;rollback;
