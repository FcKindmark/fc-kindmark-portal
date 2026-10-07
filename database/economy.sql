-- FC Kindmark accounting workspace. Calendar years, SEK; explicit confirmation of proposals.
create table public.club_econ_accounts(code text primary key check(code ~ '^[1-8][0-9]{3}$'), name text not null, kind text not null check(kind in ('asset','liability','equity','income','expense')));
insert into public.club_econ_accounts values
('1910','Kassa','asset'),('1930','Föreningens bankkonto','asset'),('1510','Kundfordringar','asset'),('1220','Inventarier','asset'),('2010','Eget kapital','equity'),('2440','Leverantörsskulder','liability'),('2611','Utgående moms','liability'),('2641','Ingående moms','asset'),('2900','Övriga skulder','liability'),('3901','Medlemsavgifter','income'),('3902','Träningsavgifter','income'),('3910','Sponsring','income'),('3980','Bidrag och stöd','income'),('3990','Gåvor och övriga intäkter','income'),('3001','Försäljning av kläder','income'),('4010','Kläder och utrustning','expense'),('5010','Hall och planhyra','expense'),('6110','Kontorsmaterial','expense'),('6570','Bankkostnader','expense'),('6990','Övriga kostnader','expense');
create table public.club_econ_partners(id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name))>0), kind text not null check(kind in ('sponsor','grant')), agreed_amount numeric(14,2) not null default 0 check(agreed_amount>=0), year integer not null check(year between 2000 and 2100), note text not null default '', created_at timestamptz not null default now());
create table public.club_econ_documents(id uuid primary key default gen_random_uuid(), name text not null, path text unique not null, kind text not null check(kind in ('purchase','sales','sponsor','grant','receipt','statement')), party text not null default '', document_date date not null, due_date date, amount numeric(14,2) not null default 0 check(amount>=0), reference text not null default '', partner_id uuid references public.club_econ_partners on delete restrict, created_at timestamptz not null default now());
create index on public.club_econ_documents(partner_id);
create table public.club_econ_bank(id uuid primary key default gen_random_uuid(), date date not null, amount numeric(14,2) not null check(amount<>0), description text not null default '', reference text not null default '', fingerprint text unique not null, import_name text not null, statement_document uuid references public.club_econ_documents on delete restrict, created_at timestamptz not null default now());
create index on public.club_econ_bank(date);create index on public.club_econ_bank(statement_document);
create table public.club_econ_years(year integer primary key check(year between 2000 and 2100), last_number integer not null default 0, locked_at timestamptz, locked_by uuid references auth.users, statement_balance numeric(14,2));
create table public.club_econ_journal(id uuid primary key default gen_random_uuid(), date date not null, description text not null check(length(trim(description))>0), type text not null default 'normal' check(type in ('normal','opening')), status text not null default 'draft' check(status in ('draft','posted')), number integer, year integer not null, bank_id uuid references public.club_econ_bank on delete restrict, document_id uuid references public.club_econ_documents on delete restrict, partner_id uuid references public.club_econ_partners on delete restrict, reversal_of uuid unique references public.club_econ_journal on delete restrict, created_by uuid not null references auth.users, created_at timestamptz not null default now(), posted_at timestamptz, unique(year,number));
create index on public.club_econ_journal(bank_id);create index on public.club_econ_journal(document_id);create index on public.club_econ_journal(partner_id);create index on public.club_econ_journal(date);create index on public.club_econ_journal(created_by);
create table public.club_econ_lines(id uuid primary key default gen_random_uuid(), journal_id uuid not null references public.club_econ_journal on delete cascade, account text not null references public.club_econ_accounts, debit numeric(14,2) not null default 0, credit numeric(14,2) not null default 0, check((debit>0 and credit=0) or (credit>0 and debit=0)));
create index on public.club_econ_lines(journal_id);create index on public.club_econ_lines(account);
create table public.club_econ_audit(id bigint generated always as identity primary key, actor uuid references auth.users, action text not null, entity text not null, entity_id uuid, detail jsonb not null default '{}', at timestamptz not null default now());
create index on public.club_econ_audit(actor);
create table public.club_econ_payment_links(journal_id uuid not null references public.club_econ_journal on delete restrict,payment_id uuid not null references public.payments on delete restrict,previous_state jsonb not null,primary key(journal_id,payment_id));
create index on public.club_econ_payment_links(payment_id);
alter table public.club_econ_payment_links enable row level security;
revoke all on public.club_econ_payment_links from public,anon,authenticated;
grant select on public.club_econ_payment_links to authenticated;
create policy econ_links_admin_read on public.club_econ_payment_links for select to authenticated using((select public.is_admin()));

-- Privileged atomic operations keep confirmed entries immutable and balance all postings.
create function public.club_econ_entry(action text, payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
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
         if exists(select 1 from public.club_econ_payment_links pl join public.club_econ_journal h on h.id=pl.journal_id where pl.payment_id=pid and not exists(select 1 from public.club_econ_journal r where r.reversal_of=h.id)) then raise exception 'Betalningen är redan kopplad till bokföring'; end if;
         total_alloc:=total_alloc+pay.amount;
         if pay.payment_kind='membership' then member_alloc:=member_alloc+pay.amount; end if;
         insert into public.club_econ_payment_links(journal_id,payment_id,previous_state) values(eid,pid,jsonb_build_object('status',pay.status,'paid_date',pay.paid_date,'paid_reference',pay.paid_reference));
         -- Preserve an earlier manually confirmed bank reference; otherwise populate from the bank row.
         if pay.status<>'paid' then update public.payments set status='paid',paid_date=b.date,paid_reference=coalesce(nullif(b.reference,''),'Bankrad '||b.id::text) where id=pid; end if;
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
revoke all on function public.club_econ_entry(text,jsonb) from public,anon;grant execute on function public.club_econ_entry(text,jsonb) to authenticated;
create function public.club_econ_lock_year(p_year integer,p_balance numeric) returns void language plpgsql security definer set search_path='' as $$
declare net numeric;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Endast administratör'; end if;
 perform pg_catalog.pg_advisory_xact_lock(67677);
 insert into public.club_econ_years(year) values(p_year) on conflict do nothing;
 perform 1 from public.club_econ_years where year=p_year for update;
 if exists(select 1 from public.club_econ_years where year=p_year and locked_at is not null) then raise exception 'Året är redan låst'; end if;
 if exists(select 1 from public.club_econ_journal where year=p_year and status='draft') then raise exception 'Det finns utkast kvar'; end if;
 if exists(select 1 from public.club_econ_bank b where extract(year from b.date)=p_year and (select coalesce(sum(l.debit-l.credit),0) from public.club_econ_journal j join public.club_econ_lines l on l.journal_id=j.id and l.account='1930' where j.bank_id=b.id and j.status='posted')<>b.amount) then raise exception 'Bankrader återstår att stämma av'; end if;
 select coalesce(sum(l.debit-l.credit),0) into net from public.club_econ_journal j join public.club_econ_lines l on l.journal_id=j.id where j.status='posted' and j.date<=make_date(p_year,12,31) and l.account='1930';
 if p_balance is null or round(p_balance,2)<>net then raise exception 'Saldo i bokföringen stämmer inte med bankens årsslutssaldo'; end if;
 update public.club_econ_years set locked_at=now(),locked_by=auth.uid(),statement_balance=p_balance where year=p_year;
 insert into public.club_econ_audit(actor,action,entity,detail) values(auth.uid(),'lock','year',jsonb_build_object('year',p_year,'bank_balance',p_balance));
end $$;
revoke all on function public.club_econ_lock_year(integer,numeric) from public,anon;grant execute on function public.club_econ_lock_year(integer,numeric) to authenticated;
-- Admin-only visibility at database and storage layers. No parent or trainer access.
do $$declare t text;begin
 foreach t in array array['accounts','partners','documents','bank','years','journal','lines','audit'] loop
  execute format('alter table public.%I enable row level security','club_econ_'||t);
  execute format('revoke all on public.%I from public,anon,authenticated','club_econ_'||t);
  execute format('create policy econ_admin_read on public.%I for select to authenticated using ((select public.is_admin()))','club_econ_'||t);
  execute format('grant select on public.%I to authenticated','club_econ_'||t);
 end loop;
 foreach t in array array['partners','documents','bank'] loop
  execute format('create policy econ_admin_write on public.%I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))','club_econ_'||t);
  execute format('grant insert,update,delete on public.%I to authenticated','club_econ_'||t);
 end loop;
end $$;
create function public.club_econ_metadata_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='club_econ_bank' then
   perform pg_catalog.pg_advisory_xact_lock(67677);
   if tg_op<>'INSERT' then raise exception 'Importerade bankrader kan inte ändras eller raderas'; end if;
   if exists(select 1 from public.club_econ_years where year>=extract(year from new.date) and locked_at is not null) then raise exception 'Året är låst'; end if;
 elsif tg_table_name='club_econ_documents' then
   if tg_op<>'INSERT' and exists(select 1 from public.club_econ_journal where document_id=old.id and status='posted') then raise exception 'Bokfört underlag måste bevaras'; end if;
 end if;
 insert into public.club_econ_audit(actor,action,entity,entity_id,detail) values(auth.uid(),tg_op,tg_table_name,case when tg_op='DELETE' then old.id else new.id end,jsonb_build_object('before',case when tg_op='INSERT' then null else to_jsonb(old) end,'after',case when tg_op='DELETE' then null else to_jsonb(new) end));
 if tg_op='DELETE' then return old; end if;return new;
end $$;
revoke all on function public.club_econ_metadata_guard() from public,anon,authenticated;
create trigger econ_bank_guard before insert or update or delete on public.club_econ_bank for each row execute function public.club_econ_metadata_guard();
create trigger econ_document_guard before insert or update or delete on public.club_econ_documents for each row execute function public.club_econ_metadata_guard();
create trigger econ_partner_guard before insert or update or delete on public.club_econ_partners for each row execute function public.club_econ_metadata_guard();
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('club-economy','club-economy',false,15728640,array['application/pdf','image/jpeg','image/png','text/csv','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']) on conflict(id) do nothing;
create policy econ_files_read on storage.objects for select to authenticated using(bucket_id='club-economy' and (select public.is_admin()));
create policy econ_files_add on storage.objects for insert to authenticated with check(bucket_id='club-economy' and (select public.is_admin()));
-- Only orphan uploads can be removed. Referenced financial evidence cannot be overwritten/deleted.
create policy econ_files_remove on storage.objects for delete to authenticated using(bucket_id='club-economy' and (select public.is_admin()) and not exists(select 1 from public.club_econ_documents where path=storage.objects.name));

create function public.club_econ_payment_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.club_econ_payment_links l join public.club_econ_journal j on j.id=l.journal_id where l.payment_id=old.id and j.status='posted' and not exists(select 1 from public.club_econ_journal r where r.reversal_of=j.id)) then
  if tg_op='DELETE' then raise exception 'Betalningen är kopplad till bokföring och måste bevaras'; end if;
  if (to_jsonb(new)-array['status','paid_date','paid_reference'])<>(to_jsonb(old)-array['status','paid_date','paid_reference']) or new.status<>'paid' then raise exception 'Betalningen är bokförd. Gör en motverifikation i Ekonomi före ändring';end if;
  if old.status='paid' and (new.paid_date is distinct from old.paid_date or new.paid_reference is distinct from old.paid_reference) then raise exception 'Bankreferensen är bokförd och måste bevaras';end if;
 end if;
 if tg_op='DELETE' then return old;end if;return new;
end $$;
revoke all on function public.club_econ_payment_guard() from public,anon,authenticated;
create trigger economy_payment_guard before update or delete on public.payments for each row execute function public.club_econ_payment_guard();

create function public.club_econ_snapshot() returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Endast administratör';end if;
 select jsonb_build_object(
 'accounts',coalesce((select jsonb_agg(a order by a.code) from public.club_econ_accounts a),'[]'::jsonb),
 'partners',coalesce((select jsonb_agg(a order by a.created_at desc,a.id) from public.club_econ_partners a),'[]'::jsonb),
 'documents',coalesce((select jsonb_agg(a order by a.created_at desc,a.id) from public.club_econ_documents a),'[]'::jsonb),
 'bank',coalesce((select jsonb_agg(a order by a.date,a.id) from public.club_econ_bank a),'[]'::jsonb),
 'years',coalesce((select jsonb_agg(a order by a.year) from public.club_econ_years a),'[]'::jsonb),
 'journal',coalesce((select jsonb_agg(a order by a.date desc,a.number desc) from public.club_econ_journal a),'[]'::jsonb),
 'lines',coalesce((select jsonb_agg(a order by a.journal_id,a.id) from public.club_econ_lines a),'[]'::jsonb),
 'payment_links',coalesce((select jsonb_agg(a) from public.club_econ_payment_links a),'[]'::jsonb),
 'audit',coalesce((select jsonb_agg(a order by a.at desc,a.id desc) from (select * from public.club_econ_audit order by at desc,id desc limit 100) a),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.club_econ_snapshot() from public,anon;
grant execute on function public.club_econ_snapshot() to authenticated;
