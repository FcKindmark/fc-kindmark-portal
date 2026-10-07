create or replace function public.club_econ_entry(action text, payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare eid uuid; old public.club_econ_journal; j public.club_econ_journal; dt date; yr integer; num integer; line jsonb; deb numeric; cred numeric; b public.club_econ_bank; banknet numeric; banktotal numeric; pay public.payments; pid uuid; total_alloc numeric:=0; member_alloc numeric:=0; credit_income numeric; member_credit numeric; state jsonb;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Endast administratör'; end if;
 perform pg_catalog.pg_advisory_xact_lock(67677);
 if action not in ('save','post','delete','reverse') then raise exception 'Okänd åtgärd'; end if;
 if coalesce(payload->>'id','')<>'' then eid:=(payload->>'id')::uuid; select * into old from public.club_econ_journal where id=eid for update; if not found then raise exception 'Verifikationen saknas'; end if; end if;
 dt:=coalesce((payload->>'date')::date,old.date); yr:=extract(year from dt)::integer;
 if action='delete' then yr:=old.year; end if;
 insert into public.club_econ_years(year) values(yr) on conflict do nothing;
 perform 1 from public.club_econ_years where year=yr for update;
 if exists(select 1 from public.club_econ_years where year>=least(yr,coalesce(old.year,yr)) and locked_at is not null) then raise exception 'Året är låst'; end if;
 if action='delete' then
   if old.status<>'draft' then raise exception 'Bokförda verifikationer rättas med en motverifikation'; end if;
   delete from public.club_econ_journal where id=eid;
 elsif action='reverse' then
   if old.status<>'posted' then raise exception 'Endast bokförda verifikationer kan rättas'; end if;
   if old.reversal_of is not null or exists(select 1 from public.club_econ_journal where reversal_of=old.id) then raise exception 'Verifikationen är redan rättad eller är en rättelse'; end if;
   if length(trim(coalesce(payload->>'reason','')))<3 then raise exception 'Ange orsak till rättelsen'; end if;
   update public.club_econ_years set last_number=last_number+1 where year=yr returning last_number into num;
   insert into public.club_econ_journal(date,description,type,status,number,year,bank_id,document_id,partner_id,reversal_of,created_by,posted_at) values(dt,'Rättelse: '||old.description||' · '||(payload->>'reason'),old.type,'posted',num,yr,old.bank_id,old.document_id,old.partner_id,old.id,auth.uid(),now()) returning id into eid;
   insert into public.club_econ_lines(journal_id,account,debit,credit) select eid,account,credit,debit from public.club_econ_lines where journal_id=old.id;
   for pid,state in select payment_id,previous_state from public.club_econ_payment_links where journal_id=old.id loop
     update public.payments set status=state->>'status',paid_date=(state->>'paid_date')::date,paid_reference=state->>'paid_reference' where id=pid;
   end loop;
 else
   if old.status='posted' then raise exception 'Bokförda verifikationer kan inte ändras'; end if;
   if dt is null or yr not between 2000 and 2100 then raise exception 'Kontrollera datum'; end if;
   if jsonb_typeof(payload->'lines')<>'array' or jsonb_array_length(payload->'lines')<2 then raise exception 'Minst två konteringsrader krävs'; end if;
   deb:=0; cred:=0;
   for line in select * from jsonb_array_elements(payload->'lines') loop
     if coalesce((line->>'debit')::numeric,0)<0 or coalesce((line->>'credit')::numeric,0)<0 or ((coalesce((line->>'debit')::numeric,0)>0)=(coalesce((line->>'credit')::numeric,0)>0)) then raise exception 'En rad måste ha debet eller kredit'; end if;
     deb:=deb+round(coalesce((line->>'debit')::numeric,0),2); cred:=cred+round(coalesce((line->>'credit')::numeric,0),2);
     if payload->>'type'='opening' and exists(select 1 from public.club_econ_accounts where code=line->>'account' and kind in ('income','expense')) then raise exception 'Ingående balans använder balanskonton'; end if;
   end loop;
   if deb<>cred or deb<=0 then raise exception 'Debet och kredit måste vara lika'; end if;
   if old.id is null then
     insert into public.club_econ_journal(date,description,type,year,bank_id,document_id,partner_id,created_by) values(dt,payload->>'description',coalesce(payload->>'type','normal'),yr,nullif(payload->>'bank_id','')::uuid,nullif(payload->>'document_id','')::uuid,nullif(payload->>'partner_id','')::uuid,auth.uid()) returning id into eid;
   else
     update public.club_econ_journal set date=dt,year=yr,description=payload->>'description',type=coalesce(payload->>'type','normal'),bank_id=nullif(payload->>'bank_id','')::uuid,document_id=nullif(payload->>'document_id','')::uuid,partner_id=nullif(payload->>'partner_id','')::uuid where id=eid;
     delete from public.club_econ_lines where journal_id=eid;
   end if;
   insert into public.club_econ_lines(journal_id,account,debit,credit) select eid,v->>'account',round(coalesce((v->>'debit')::numeric,0),2),round(coalesce((v->>'credit')::numeric,0),2) from jsonb_array_elements(payload->'lines') v;
   if action='post' then
     select * into j from public.club_econ_journal where id=eid;
     if j.document_id is null and j.bank_id is null then raise exception 'Koppla ett underlag eller en bankrad före bokföring'; end if;
     if j.type='opening' and (extract(month from j.date)<>1 or extract(day from j.date)<>1) then raise exception 'Ingående balans ska dateras 1 januari'; end if;
     if j.bank_id is not null then
       select * into b from public.club_econ_bank where id=j.bank_id for update;
       select coalesce(sum(debit-credit),0) into banknet from public.club_econ_lines where journal_id=eid and account='1930';
       if banknet<>b.amount or j.date<>b.date then raise exception 'Bankradens datum och bankbelopp måste stämma'; end if;
       select coalesce(sum(l.debit-l.credit),0) into banktotal from public.club_econ_journal h join public.club_econ_lines l on l.journal_id=h.id and l.account='1930' where h.bank_id=j.bank_id and h.status='posted';
       if banktotal<>0 then raise exception 'Banktransaktionen är redan bokförd'; end if;
     end if;
     update public.club_econ_years set last_number=last_number+1 where year=yr returning last_number into num;
     update public.club_econ_journal set status='posted',number=num,posted_at=now() where id=eid;
     if coalesce(jsonb_array_length(payload->'payment_ids'),0)>0 then
       if j.bank_id is null or b.amount<=0 then raise exception 'Medlemsbetalningar kräver en inbetalning från banken'; end if;
       for pid in select distinct v::uuid from jsonb_array_elements_text(payload->'payment_ids') v order by v::uuid loop
         select * into pay from public.payments where id=pid for update;
         if not found then raise exception 'Betalningen saknas'; end if;
         if pay.amount is null or pay.amount<=0 then raise exception 'Betalningen saknar ett giltigt belopp';end if;
         if exists(select 1 from public.club_econ_payment_links pl join public.club_econ_journal h on h.id=pl.journal_id where pl.payment_id=pid and not exists(select 1 from public.club_econ_journal r where r.reversal_of=h.id)) then raise exception 'Betalningen är redan kopplad till bokföring'; end if;
         total_alloc:=total_alloc+pay.amount;
         if pay.payment_kind='membership' then member_alloc:=member_alloc+pay.amount; end if;
         insert into public.club_econ_payment_links(journal_id,payment_id,previous_state) values(eid,pid,jsonb_build_object('status',pay.status,'paid_date',pay.paid_date,'paid_reference',pay.paid_reference));
         -- Preserve an earlier manually confirmed bank reference; otherwise populate from the bank row.
         if pay.status is distinct from 'paid' then update public.payments set status='paid',paid_date=b.date,paid_reference=coalesce(nullif(b.reference,''),'Bankrad '||b.id::text) where id=pid; end if;
       end loop;
       select coalesce(sum(l.credit-l.debit),0) into credit_income from public.club_econ_lines l join public.club_econ_accounts a on a.code=l.account where l.journal_id=eid and a.kind='income';
       select coalesce(sum(l.credit-l.debit),0) into member_credit from public.club_econ_lines l where l.journal_id=eid and l.account='3901';
       if total_alloc>b.amount or total_alloc>credit_income or member_alloc>member_credit then raise exception 'Valda betalningar ryms inte i bankbeloppet eller intäktskonteringen'; end if;
     end if;
   end if;
 end if;
 insert into public.club_econ_audit(actor,action,entity,entity_id,detail) values(auth.uid(),action,'journal',eid,payload);
 return eid;
end $$;
