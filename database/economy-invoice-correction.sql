-- Repair a proven duplicate invoice receipt through the existing atomic correction.
create function public.club_econ_repair_invoice_payment(p_document uuid) returns uuid
language plpgsql security invoker set search_path='' as $$
declare d public.club_econ_documents;j public.club_econ_journal; a public.club_econ_document_links; balance numeric;result uuid;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Endast administratör';end if;
 perform pg_catalog.pg_advisory_xact_lock(67677);
 select * into d from public.club_econ_documents where id=p_document;
 if not found or d.kind not in ('sales','sponsor','grant') then raise exception 'Kundfakturan saknas';end if;
 if (select count(*) from public.club_econ_document_links x join public.club_econ_journal h on h.id=x.journal_id where x.document_id=d.id and h.status='posted' and h.reversal_of is null and not exists(select 1 from public.club_econ_journal r where r.reversal_of=h.id))<>1 then raise exception 'Använd manuell rättelse för denna fördelning';end if;
 select x.* into a from public.club_econ_document_links x join public.club_econ_journal h on h.id=x.journal_id where x.document_id=d.id and h.status='posted' and h.reversal_of is null and not exists(select 1 from public.club_econ_journal r where r.reversal_of=h.id);
 select * into j from public.club_econ_journal where id=a.journal_id;
 if a.amount<>d.amount or a.account not in ('3910','3980','3990') or (select count(*) from public.club_econ_document_links where journal_id=j.id)<>1 or exists(select 1 from public.club_econ_payment_links where journal_id=j.id) then raise exception 'Rättelsen kräver en separat full fakturabetalning';end if;
 if (select count(*) from public.club_econ_lines where journal_id=j.id)<>2 or not exists(select 1 from public.club_econ_lines where journal_id=j.id and account='1930' and debit=d.amount and credit=0) or not exists(select 1 from public.club_econ_lines where journal_id=j.id and account=a.account and credit=d.amount and debit=0) then raise exception 'Kontrollera konteringen manuellt';end if;
 select coalesce(sum(l.debit-l.credit),0) into balance from public.club_econ_lines l join public.club_econ_journal h on h.id=l.journal_id where h.document_id=d.id and h.bank_id is null and h.status='posted' and l.account='1510';
 if balance<>d.amount then raise exception 'Fakturans fordran måste kontrolleras manuellt';end if;
 result:=public.club_econ_correct(j.id,'Betalning reglerar redan bokförd faktura; tar bort dubbel intäkt',jsonb_build_object('date',j.date,'description',j.description||' · Faktura '||d.reference,'partner_id',d.partner_id,'document_allocations',jsonb_build_array(jsonb_build_object('document_id',d.id,'amount',d.amount,'account','1510')),'lines',jsonb_build_array(jsonb_build_object('account','1930','debit',d.amount,'credit',0),jsonb_build_object('account','1510','debit',0,'credit',d.amount))));
 return result;
end $$;
revoke all on function public.club_econ_repair_invoice_payment(uuid) from public,anon;
grant execute on function public.club_econ_repair_invoice_payment(uuid) to authenticated;
notify pgrst,'reload schema';
