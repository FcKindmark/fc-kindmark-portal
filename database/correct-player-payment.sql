-- Corrections run through the existing guarded economy entry; finance tables remain private.
CREATE OR REPLACE FUNCTION public.club_econ_entry(action text, payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare eid uuid; oldid uuid; row jsonb; doc public.club_econ_documents; bank public.club_econ_bank;
 amount numeric; paid numeric; booked numeric; incoming boolean; expected text; kind text;
 incomes jsonb:=coalesce(payload->'income_allocations','[]'::jsonb);
 allocations jsonb:=coalesce(payload->'document_allocations','[]'::jsonb);
 fee numeric:=round(coalesce(nullif(payload->>'bank_fee','')::numeric,0),2);
 person_name text; normalized jsonb:='[]';
 expected_lines jsonb:='[]'::jsonb; payment_total numeric:=0; total numeric:=0; item record;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Endast administratör';end if;
 if action='correct_player_payment' then
 declare p_original uuid:=(payload->>'payment_id')::uuid; p_source uuid:=(payload->>'source_id')::uuid; p_target uuid:=(payload->>'target_id')::uuid; p_move_equipment boolean:=coalesce((payload->>'move_equipment')::boolean,false);
 j public.club_econ_journal; b public.club_econ_bank; src public.payments; dst public.payments; card public.club_member_cards; target_name text; clothing uuid; corrected uuid; lines jsonb;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Endast administratör';end if;
 if p_source is null or p_target is null or p_source=p_target then raise exception 'Välj två olika spelare';end if;
 perform pg_advisory_xact_lock(67677);
 select * into j from public.club_econ_journal where id=(select l.journal_id from public.club_econ_payment_links l join public.club_econ_journal h on h.id=l.journal_id where l.payment_id=p_original and h.status='posted' and not exists(select 1 from public.club_econ_journal r where r.reversal_of=h.id)) for update;
 if not found or j.status<>'posted' or j.reversal_of is not null or exists(select 1 from public.club_econ_journal where reversal_of=j.id) then raise exception 'Verifikationen saknas eller är redan rättad';end if;
 select * into b from public.club_econ_bank where id=j.bank_id;
 if not found or b.amount<>850 then raise exception 'Denna rättelse gäller inbetalning 850 SEK (50 medlemsavgift och 800 träningskläder)';end if;
 if (select count(*) from public.club_econ_payment_links where journal_id=j.id)<>1 then raise exception 'Kontrollera betalningskopplingarna i Ekonomi';end if;
 select p.* into src from public.payments p join public.club_econ_payment_links l on l.payment_id=p.id where l.journal_id=j.id and p.player_id=p_source and p.payment_kind='membership' and p.amount=50 and p.status='paid' for update of p;
 if not found then raise exception 'Den betalda medlemsavgiften kunde inte verifieras';end if;
 select name into target_name from public.players where id=p_target;
 if not found then raise exception 'Mottagande spelare saknas';end if;
 if (select count(*) from public.club_member_cards where player_id=p_target)<>1 then raise exception 'Mottagaren måste ha ett medlemskort';end if;
 select * into card from public.club_member_cards where player_id=p_target for update;
 select * into dst from public.payments where member_id=card.id and membership_year=src.membership_year and payment_kind='membership' for update;
 if not found or dst.status<>'pending' or dst.amount<>50 or dst.player_id<>p_target then raise exception 'Mottagaren måste ha en obetald medlemsavgift på 50 SEK för samma år';end if;
 if exists(select 1 from public.club_econ_payment_links l join public.club_econ_journal h on h.id=l.journal_id where l.payment_id=dst.id and not exists(select 1 from public.club_econ_journal r where r.reversal_of=h.id)) then raise exception 'Mottagarens avgift är redan bokförd';end if;
 if exists(select 1 from public.payments existing_clothing where existing_clothing.player_id=p_target and existing_clothing.amount=800 and existing_clothing.payment_category='clothing') then raise exception 'Mottagaren har redan en klädpost på 800 SEK. Kontrollera den först';end if;
 if (select count(*) from public.club_econ_lines where journal_id=j.id)<>3 or not exists(select 1 from public.club_econ_lines where journal_id=j.id and account='1930' and debit=850 and credit=0) or not exists(select 1 from public.club_econ_lines where journal_id=j.id and account='3901' and credit=50 and debit=0) or not exists(select 1 from public.club_econ_lines where journal_id=j.id and account='3903' and credit=800 and debit=0) then raise exception 'Konteringen stämmer inte med 50 + 800 SEK';end if;
 select jsonb_agg(jsonb_build_object('account',account,'debit',debit,'credit',credit)) into lines from public.club_econ_lines where journal_id=j.id;
 perform public.club_econ_entry('reverse',jsonb_build_object('id',j.id,'date',j.date,'reason','Fel spelare. Inbetalningen tillhör '||target_name));
 insert into public.payments(player_id,player_name,member_id,membership_no,amount,description,status,payment_kind,payment_category,reference,bank_message)
 values(p_target,target_name,card.id,card.membership_no,800,'Träningskläder','pending','other','clothing',card.membership_no::text||'-'||src.membership_year::text||'-KLADER','Rättelse av spelarkoppling från verifikation '||j.number::text||'/'||j.year::text)
 returning id into clothing;
 corrected:=public.club_econ_entry('post',jsonb_build_object('date',j.date,'description',j.description||' · Rätt spelare: '||target_name,'type',j.type,'bank_id',j.bank_id,'document_id',j.document_id,'partner_id',j.partner_id,'lines',lines,'payment_ids',jsonb_build_array(dst.id,clothing)));
 if p_move_equipment then update public.club_equipment set player_id=p_target where player_id=p_source;end if;
 return corrected;
end;
 end if;
 perform pg_catalog.pg_advisory_xact_lock(67677);
 oldid:=nullif(payload->>'id','')::uuid;
 if jsonb_typeof(allocations)<>'array' or jsonb_array_length(allocations)>200 then raise exception 'Kontrollera fakturafördelningen';end if;
 if fee<0 or fee::text in ('NaN','Infinity','-Infinity') then raise exception 'Kontrollera bankprovisionen';end if;
 if jsonb_typeof(incomes)<>'array' or jsonb_array_length(incomes)>200 then raise exception 'Kontrollera intäktsfördelningen';end if;
 if action in ('save','post') and (jsonb_array_length(allocations)>0 or jsonb_array_length(incomes)>0 or fee>0) then
   select * into bank from public.club_econ_bank where id=nullif(payload->>'bank_id','')::uuid for update;
   if not found then raise exception 'Fakturabetalningar kräver en bankrad';end if;
   if coalesce(payload->>'document_id','')<>'' then raise exception 'Använd fakturafördelningen, inte ett separat underlag';end if;
   incoming:=bank.amount>0;
   if not incoming and fee>abs(bank.amount) then raise exception 'Bankprovisionen överstiger bankbeloppet';end if;
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
   if jsonb_array_length(incomes)>0 and not incoming then raise exception 'Intäktsfördelning kräver en inbetalning';end if;
   if (select count(distinct concat(v->>'category','|',v->>'member_id','|',v->>'player_id')) from jsonb_array_elements(incomes) v)<>jsonb_array_length(incomes) then raise exception 'Intäktskategorin förekommer flera gånger';end if;
   for row in select v from jsonb_array_elements(incomes) v loop
     expected:=case row->>'category' when 'cup' then '3904' when 'training' then '3902' when 'clothing' then '3903' when 'kiosk' then '3054' when 'donation' then '3993' end;
     amount:=round((row->>'amount')::numeric,2);
     if expected is null or amount is null or amount<=0 or amount::text in ('NaN','Infinity','-Infinity') then raise exception 'Kontrollera intäktskategori och belopp';end if;
     if nullif(row->>'member_id','') is not null and nullif(row->>'player_id','') is not null then raise exception 'Välj en person per betalningsrad';end if;
     person_name:=null;
     if nullif(row->>'member_id','') is not null then
       select m.name into person_name from public.club_member_cards m where m.id=(row->>'member_id')::uuid;
       if not found then raise exception 'Medlemmen saknas';end if;
     elsif nullif(row->>'player_id','') is not null then
       select p.name into person_name from public.players p where p.id=(row->>'player_id')::uuid;
       if not found then raise exception 'Spelaren saknas';end if;
     end if;
     if length(coalesce(row->>'note',''))>200 then raise exception 'Beskrivningen är för lång';end if;
     normalized:=normalized||jsonb_build_array(jsonb_build_object('category',row->>'category','amount',amount,'member_id',nullif(row->>'member_id',''),'player_id',nullif(row->>'player_id',''),'person_name',person_name,'note',trim(coalesce(row->>'note',''))));
     expected_lines:=expected_lines||jsonb_build_array(jsonb_build_object('account',expected,'amount',amount));total:=total+amount;
   end loop;
   incomes:=normalized;
   if fee>0 then expected_lines:=expected_lines||jsonb_build_array(jsonb_build_object('account','6570','amount',case when incoming then -fee else fee end));end if;
   if total+payment_total>abs(bank.amount)+(case when incoming then fee else -fee end) or (action='post' and total+payment_total<>abs(bank.amount)+(case when incoming then fee else -fee end)) then raise exception 'Fördelningen måste motsvara hela bankbeloppet innan bokföring';end if;
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
 eid:=public.club_econ_entry_core(action,payload||jsonb_build_object('income_allocations',incomes,'bank_fee',fee));
 if action in ('save','post') then
   delete from public.club_econ_document_links where journal_id=eid;
   insert into public.club_econ_document_links(journal_id,document_id,amount,account)
   select eid,(v->>'document_id')::uuid,round((v->>'amount')::numeric,2),v->>'account' from jsonb_array_elements(allocations) v;
   insert into public.club_econ_settlement_selections(journal_id,payment_ids,income_allocations,bank_fee) values(eid,coalesce(payload->'payment_ids','[]'::jsonb),incomes,fee) on conflict(journal_id) do update set payment_ids=excluded.payment_ids,income_allocations=excluded.income_allocations,bank_fee=excluded.bank_fee;
 elsif action='reverse' then
   insert into public.club_econ_document_links(journal_id,document_id,amount,account)
   select eid,a.document_id,-a.amount,a.account from public.club_econ_document_links a where a.journal_id=oldid;
 end if;
 return eid;
end $function$;
CREATE OR REPLACE FUNCTION public.club_correct_player_payment(p_original uuid,p_source uuid,p_target uuid,p_move_equipment boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $wrapper$
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Endast administratör';end if;
 return public.club_econ_entry('correct_player_payment',jsonb_build_object('payment_id',p_original,'source_id',p_source,'target_id',p_target,'move_equipment',p_move_equipment));
end $wrapper$;