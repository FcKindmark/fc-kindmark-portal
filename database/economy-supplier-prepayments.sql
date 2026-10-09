-- Allow earlier supplier payments as explicit advances, without changing historic entries.
insert into public.club_econ_accounts(code,name,kind) values('1480','Förskott för varor och tjänster','asset') on conflict(code) do nothing;
create or replace function public.club_econ_entry(action text,payload jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare eid uuid; oldid uuid; row jsonb; doc public.club_econ_documents; bank public.club_econ_bank;
 amount numeric; paid numeric; booked numeric; incoming boolean; expected text; kind text;
 allocations jsonb:=coalesce(payload->'document_allocations','[]'::jsonb);
 expected_lines jsonb:='[]'::jsonb; payment_total numeric:=0; total numeric:=0; item record;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Endast administratör';end if;
 perform pg_catalog.pg_advisory_xact_lock(67677);
 oldid:=nullif(payload->>'id','')::uuid;
 if jsonb_typeof(allocations)<>'array' or jsonb_array_length(allocations)>200 then raise exception 'Kontrollera fakturafördelningen';end if;
 if action in ('save','post') and jsonb_array_length(allocations)>0 then
   select * into bank from public.club_econ_bank where id=nullif(payload->>'bank_id','')::uuid for update;
   if not found then raise exception 'Fakturabetalningar kräver en bankrad';end if;
   if coalesce(payload->>'document_id','')<>'' then raise exception 'Använd fakturafördelningen, inte ett separat underlag';end if;
   incoming:=bank.amount>0;
   if (select count(distinct v->>'document_id') from jsonb_array_elements(allocations) v)<>jsonb_array_length(allocations) then raise exception 'Fakturan förekommer flera gånger';end if;
   for row in select v from jsonb_array_elements(allocations) v order by v->>'document_id' loop
     select * into doc from public.club_econ_documents where id=(row->>'document_id')::uuid for update;
     if not found or doc.kind='statement' or doc.is_proforma or doc.amount<=0 then raise exception 'Giltig slutfaktura saknas';end if;
     if incoming<>(doc.kind in ('sales','sponsor','grant')) then raise exception 'Fel betalningsriktning';end if;
     if incoming and doc.document_date>bank.date then raise exception 'Inbetalningen är tidigare än kundfakturan';end if;
     amount:=round((row->>'amount')::numeric,2);
     if amount is null or amount<=0 then raise exception 'Ange ett positivt betalningsbelopp';end if;
     select coalesce(sum(a.amount),0) into paid from public.club_econ_document_links a join public.club_econ_journal h on h.id=a.journal_id where a.document_id=doc.id and h.status='posted';
     select paid+coalesce(sum((l.debit-l.credit)*case when incoming then 1 else -1 end),0) into paid
       from public.club_econ_journal h join public.club_econ_lines l on l.journal_id=h.id and l.account='1930'
       where h.document_id=doc.id and h.bank_id is not null and h.status='posted'
       and not exists(select 1 from public.club_econ_document_links a where a.journal_id=h.id);
     if amount>doc.amount-paid then raise exception 'Fakturan är redan betald eller fördelningen överstiger kvarvarande belopp';end if;
     expected:=case when incoming then '1510' else '2440' end;
     select coalesce(sum((l.debit-l.credit)*case when incoming then 1 else -1 end),0) into booked
       from public.club_econ_journal h join public.club_econ_lines l on l.journal_id=h.id and l.account=expected
       where h.document_id=doc.id and h.bank_id is null and h.status='posted';
     if not incoming and bank.date<doc.document_date then
       expected:='1480';
       if row->>'account' is distinct from expected then raise exception 'Förskottsbetalningen ska bokföras på konto 1480';end if;
     elsif booked>0 then
       if row->>'account' is distinct from expected then raise exception 'Bokförd faktura regleras mot fordran/skuld';end if;
     else
       expected:=row->>'account';
       select a.kind into kind from public.club_econ_accounts a where a.code=expected;
       if kind is distinct from (case when incoming then 'income' else 'expense' end) then raise exception 'Kontrollera fakturans intäkts-/kostnadskonto';end if;
       if doc.kind='sponsor' and expected<>'3910' or doc.kind='grant' and expected<>'3980' then raise exception 'Kontrollera sponsor-/bidragskonto';end if;
     end if;
     expected_lines:=expected_lines||jsonb_build_array(jsonb_build_object('account',expected,'amount',amount));total:=total+amount;
   end loop;
   for item in select p.* from public.payments p where p.id in (select v::uuid from jsonb_array_elements_text(coalesce(payload->'payment_ids','[]'::jsonb)) v) loop
     expected_lines:=expected_lines||jsonb_build_array(jsonb_build_object('account',case when item.payment_kind='membership' then '3901' else '3990' end,'amount',item.amount));
     payment_total:=payment_total+item.amount;
   end loop;
   if total+payment_total>abs(bank.amount) or (action='post' and total+payment_total<>abs(bank.amount)) then raise exception 'Fördelningen måste motsvara hela bankbeloppet innan bokföring';end if;
   if action='post' then
     for item in select v->>'account' as account,sum((v->>'amount')::numeric) as amount from jsonb_array_elements(expected_lines) v group by v->>'account' loop
       select coalesce(sum(case when incoming then (l->>'credit')::numeric-(l->>'debit')::numeric else (l->>'debit')::numeric-(l->>'credit')::numeric end),0) into amount from jsonb_array_elements(payload->'lines') l where l->>'account'=item.account;
       if round(amount,2)<>item.amount then raise exception 'Konteringen stämmer inte med betalningsfördelningen';end if;
     end loop;
     if exists(select 1 from jsonb_array_elements(payload->'lines') l where l->>'account'<>'1930' and not exists(select 1 from jsonb_array_elements(expected_lines) v where v->>'account'=l->>'account')) then raise exception 'Extra konteringsrader saknar betalningsfördelning';end if;
   end if;
 end if;
 if action='reverse' and exists(
 select 1 from public.club_econ_document_links a where a.journal_id=oldid and a.account='1480' and
 (select coalesce(sum(l.credit-l.debit),0) from public.club_econ_lines l join public.club_econ_journal j on j.id=l.journal_id
 where j.document_id=a.document_id and j.bank_id is null and j.status='posted' and l.account='1480')>0
 ) then raise exception 'Rätta först fakturans avräkning av förskottet. Därefter kan utbetalningen rättas.';end if;
 if action='post' and coalesce(payload->>'bank_id','')='' and coalesce(payload->>'document_id','')<>'' then
 select coalesce(sum(coalesce((v->>'credit')::numeric,0)-coalesce((v->>'debit')::numeric,0)),0) into amount from jsonb_array_elements(payload->'lines') v where v->>'account'='1480';
 if amount>0 then
 select coalesce(sum(a.amount),0) into paid from public.club_econ_document_links a join public.club_econ_journal j on j.id=a.journal_id
 where a.document_id=(payload->>'document_id')::uuid and a.account='1480' and j.status='posted' and j.date<=(payload->>'date')::date;
 select paid-coalesce(sum(l.credit-l.debit),0) into paid from public.club_econ_lines l join public.club_econ_journal j on j.id=l.journal_id
 where j.document_id=(payload->>'document_id')::uuid and j.bank_id is null and j.status='posted' and l.account='1480';
 if amount>paid then raise exception 'Avräkningen överstiger det bokförda förskottet';end if;
 end if;
 end if;
 -- The existing core retains balanced entry, year-lock, bank duplicate and member guards.
 eid:=public.club_econ_entry_core(action,payload);
 if action in ('save','post') then
   delete from public.club_econ_document_links where journal_id=eid;
   insert into public.club_econ_document_links(journal_id,document_id,amount,account)
   select eid,(v->>'document_id')::uuid,round((v->>'amount')::numeric,2),v->>'account' from jsonb_array_elements(allocations) v;
   insert into public.club_econ_settlement_selections(journal_id,payment_ids) values(eid,coalesce(payload->'payment_ids','[]'::jsonb)) on conflict(journal_id) do update set payment_ids=excluded.payment_ids;
 elsif action='reverse' then
   insert into public.club_econ_document_links(journal_id,document_id,amount,account)
   select eid,a.document_id,-a.amount,a.account from public.club_econ_document_links a where a.journal_id=oldid;
 end if;
 return eid;
end $$;
revoke all on function public.club_econ_entry(text,jsonb) from public,anon;
grant execute on function public.club_econ_entry(text,jsonb) to authenticated;


notify pgrst,'reload schema';
