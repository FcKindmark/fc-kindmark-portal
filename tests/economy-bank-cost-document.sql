begin;set local role authenticated;select set_config('request.jwt.claims','{"sub":"464a9f89-ae01-4c5a-98f1-5984354118d8","app_metadata":{"club_role":"admin"}}',true);
do $$declare d uuid;b uuid;e uuid;begin
insert into public.club_econ_documents(name,path,kind,party,document_date,amount) values('TEST bank fee','test/'||gen_random_uuid(),'receipt','TEST bank','2098-04-01',25) returning id into d;
insert into public.club_econ_bank(date,amount,description,fingerprint,import_name) values('2098-04-02',-25,'TEST bank fee','test-'||gen_random_uuid(),'TEST') returning id into b;
e:=public.club_econ_entry('post',jsonb_build_object('date','2098-04-02','description','TEST bank fee document','bank_id',b,'document_allocations',jsonb_build_array(jsonb_build_object('document_id',d,'amount',25,'account','6570')),'lines','[{"account":"1930","debit":0,"credit":25},{"account":"6570","debit":25,"credit":0}]'::jsonb));
if not exists(select 1 from public.club_econ_document_links where journal_id=e and document_id=d and account='6570') then raise exception 'Bank cost document not linked';end if;
if not exists(select 1 from jsonb_array_elements(public.club_econ_snapshot()->'accounts') a where a->>'code'='3001' and (a->>'active')::boolean=false) then raise exception 'Inactive account flag missing from snapshot';end if;
end $$;select 'PASS: bank cost document linked to 6570 and duplicate account inactive in snapshot; fixtures rolled back' result;rollback;
