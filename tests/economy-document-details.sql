begin;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"464a9f89-ae01-4c5a-98f1-5984354118d8","app_metadata":{"club_role":"admin"}}',true);
do $$declare d uuid; failed boolean := false; begin
 insert into public.club_econ_documents(name,path,kind,party,document_date,amount,source_currency,source_amount,is_proforma,conversion_note)
 values('TEST source invoice','test/'||gen_random_uuid(),'purchase','TEST','2099-02-01',13000,'EUR',1175.82,true,'TEST bank evidence') returning id into d;
 update public.club_econ_documents set source_amount=1200,conversion_note='TEST corrected evidence' where id=d;
 if not exists(select 1 from public.club_econ_documents where id=d and source_amount=1200 and source_currency='EUR' and amount=13000 and is_proforma) then raise exception 'Source data not persisted/editable'; end if;
 begin update public.club_econ_documents set conversion_note='' where id=d; exception when check_violation then failed:=true; end;
 if not failed then raise exception 'Missing evidence accepted'; end if;
 if not exists(select 1 from public.club_econ_audit where entity_id=d and action='UPDATE') then raise exception 'Missing audit'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"374e427a-43bb-4944-ae3a-514b0d8569b8","app_metadata":{"club_role":"parent"}}',true);
do $$begin if exists(select 1 from public.club_econ_documents where name='TEST source invoice') then raise exception 'Parent sees evidence'; end if; end $$;
select 'PASS: currency persistence, editable source data, evidence validation, audit and parent isolation' as result;
rollback;
