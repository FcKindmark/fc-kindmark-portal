-- Synthetic records only; every write is rolled back.
begin;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"464a9f89-ae01-4c5a-98f1-5984354118d8","app_metadata":{"club_role":"admin"}}',true);
do $$declare doc uuid;bank uuid;entry uuid;body jsonb;caught boolean;begin
 insert into public.club_econ_documents(name,path,kind,party,document_date,amount,is_proforma)
 values('TEST proforma','test/'||gen_random_uuid(),'purchase','TEST supplier','2098-10-22',1000,true) returning id into doc;
 insert into public.club_econ_bank(date,amount,description,fingerprint,import_name)
 values('2098-10-23',-300,'TEST proforma advance','test-'||gen_random_uuid(),'TEST') returning id into bank;
 body:=jsonb_build_object('date','2098-10-23','description','TEST proforma advance','bank_id',bank,
 'document_allocations',jsonb_build_array(jsonb_build_object('document_id',doc,'amount',300,'account','1480')),
 'lines','[{"account":"1930","debit":0,"credit":300},{"account":"1480","debit":300,"credit":0}]'::jsonb);
 entry:=public.club_econ_entry('save',body);
 if exists(select 1 from public.club_econ_journal where id=entry and status='posted') then raise exception 'Draft posted';end if;
 entry:=public.club_econ_entry('post',body||jsonb_build_object('id',entry));
 if not exists(select 1 from public.club_econ_document_links where journal_id=entry and document_id=doc and account='1480' and amount=300) then raise exception 'Advance link missing';end if;
 if exists(select 1 from public.club_econ_lines where journal_id=entry and account<>'1930' and account<>'1480') then raise exception 'Proforma booked as cost or VAT';end if;
 caught:=false;begin perform public.club_econ_entry('post',body);exception when others then caught:=true;end;if not caught then raise exception 'Duplicate bank payment accepted';end if;
 caught:=false;begin perform public.club_econ_entry('save',body||jsonb_build_object('document_allocations',jsonb_build_array(jsonb_build_object('document_id',doc,'amount',300,'account','6990'))));exception when others then caught:=sqlerrm like '%1480%';end;if not caught then raise exception 'Proforma cost bypass accepted';end if;
 caught:=false;begin perform public.club_econ_entry('post',jsonb_build_object('date','2098-10-23','description','TEST invalid expense','document_id',doc,'lines','[{"account":"6990","debit":1000,"credit":0},{"account":"2440","debit":0,"credit":1000}]'::jsonb));exception when others then caught:=sqlerrm like '%Proforma%';end;if not caught then raise exception 'Direct proforma expense accepted';end if;
 perform set_config('request.jwt.claims','{"sub":"464a9f89-ae01-4c5a-98f1-5984354118d8","app_metadata":{"club_role":"coach"}}',true);
 caught:=false;begin perform public.club_econ_entry('save',body);exception when others then caught:=sqlerrm like '%administratör%';end;if not caught then raise exception 'Coach access accepted';end if;
 perform set_config('request.jwt.claims','{"sub":"464a9f89-ae01-4c5a-98f1-5984354118d8","app_metadata":{"club_role":"admin"}}',true);
 perform public.club_econ_entry('reverse',jsonb_build_object('id',entry,'date','2098-10-23','reason','TEST reverse proforma'));
 if(select sum(a.amount) from public.club_econ_document_links a join public.club_econ_journal j on j.id=a.journal_id where a.document_id=doc and j.status='posted')<>0 then raise exception 'Reversal lost linked payment';end if;
end $$;
rollback;
select 'PASS: proforma draft/post after document date, advance-only account, no duplicate, cost bypass denied, admin guard, reversal; fixtures rolled back' result;
