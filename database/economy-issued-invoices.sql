create table public.club_econ_invoices(
 id uuid primary key default gen_random_uuid(),status text not null default 'draft' check(status in ('draft','issued')),
 year integer,number integer,payload jsonb not null,total numeric(14,2) not null default 0,
 document_id uuid unique references public.club_econ_documents on delete restrict,
 journal_id uuid references public.club_econ_journal on delete restrict,
 created_by uuid not null references auth.users,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),issued_at timestamptz,
 unique(year,number)
);
alter table public.club_econ_invoices enable row level security;
revoke all on public.club_econ_invoices from public,anon,authenticated;
grant select on public.club_econ_invoices to authenticated;
create policy admin_read_issued_invoices on public.club_econ_invoices for select to authenticated using((select public.is_admin()));

create function public.club_econ_invoice(action text,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare inv public.club_econ_invoices;fields jsonb:=p_payload-'id'-'updated_at';line jsonb;net numeric;vat numeric;net_total numeric:=0;vat_total numeric:=0;gross numeric;dt date;due date;yr integer;num integer;doc uuid;entry uuid;lines jsonb;income text;pid uuid;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Endast administratör';end if;
 if octet_length(p_payload::text)>50000 then raise exception 'Fakturan är för stor';end if;
 fields:=fields||jsonb_build_object('tax_mode','exempt');
 if action not in ('save','issue','delete') then raise exception 'Okänd åtgärd';end if;
 perform pg_catalog.pg_advisory_xact_lock(67677);
 if coalesce(p_payload->>'id','')<>'' then
  select * into inv from public.club_econ_invoices where id=(p_payload->>'id')::uuid for update;
  if not found then raise exception 'Fakturan saknas';end if;
  if inv.status='issued' then
   if action='issue' then return to_jsonb(inv);end if;
   raise exception 'Utställd faktura bevaras. Ändring kräver en kredit-/rättelsefaktura';
  end if;
  if p_payload->>'updated_at' is distinct from inv.updated_at::text and (p_payload->>'updated_at')::timestamptz is distinct from inv.updated_at then raise exception 'Fakturan har ändrats. Läs in den igen';end if;
 end if;
 if action='delete' then
  if inv.id is null then raise exception 'Utkastet saknas';end if;
  delete from public.club_econ_invoices where id=inv.id;
  insert into public.club_econ_audit(actor,action,entity,entity_id,detail) values(auth.uid(),'delete_invoice_draft','invoice',inv.id,inv.payload);
  return to_jsonb(inv);
 end if;
 if jsonb_typeof(fields->'items') is distinct from 'array' or jsonb_array_length(fields->'items') not between 1 and 20 then raise exception 'Ange 1–20 fakturarader';end if;
 for line in select * from jsonb_array_elements(fields->'items') loop
  if (line->>'quantity')::numeric<=0 or (line->>'unit_price')::numeric<0 or (line->>'quantity') is null or (line->>'unit_price') is null then raise exception 'Kontrollera antal och pris';end if;
  if fields->>'tax_mode' not in ('exempt','vat25','') then raise exception 'Kontrollera momsvalet';end if;
  if (line->>'quantity')::numeric<>round((line->>'quantity')::numeric,3) or (line->>'unit_price')::numeric<>round((line->>'unit_price')::numeric,2) then raise exception 'Antal högst 3 decimaler; pris högst 2 decimaler';end if;
  net:=round((line->>'quantity')::numeric*(line->>'unit_price')::numeric,2);
  vat:=case when fields->>'tax_mode'='vat25' then round(net*0.25,2) else 0 end;
  net_total:=net_total+net;vat_total:=vat_total+vat;
  if length(coalesce(line->>'description',''))>300 then raise exception 'Fakturaraden är för lång';end if;
  if action='issue' and length(trim(coalesce(line->>'description','')))=0 then raise exception 'Beskriv varje fakturarad';end if;
 end loop;
 gross:=net_total+vat_total;
 if gross>99999999 or gross='NaN'::numeric then raise exception 'Kontrollera fakturabeloppet';end if;
 if action='issue' then
  dt:=(fields->>'invoice_date')::date;due:=(fields->>'due_date')::date;yr:=extract(year from dt);
  if dt is null or due is null or due<dt or yr not between 2000 and 2100 or gross<=0 then raise exception 'Kontrollera datum och totalbelopp';end if;
  if fields->>'tax_mode' is null or fields->>'tax_mode' not in ('exempt','vat25') then raise exception 'Välj momsbehandling före utställning';end if;
  if fields->>'tax_mode'='exempt' and length(trim(coalesce(fields->>'tax_note','')))<5 then raise exception 'Ange varför moms inte debiteras';end if;
  if fields->>'tax_mode'='vat25' and length(trim(coalesce(fields->'seller'->>'vat_no','')))<8 then raise exception 'Ange säljarens momsregistreringsnummer';end if;
  if length(trim(coalesce(fields->>'customer','')))=0 or length(trim(coalesce(fields->>'customer_address','')))=0 or length(trim(coalesce(fields->'seller'->>'name','')))=0 or length(trim(coalesce(fields->'seller'->>'address','')))=0 or length(trim(coalesce(fields->'seller'->>'org_no','')))=0 then raise exception 'Ange säljarens och kundens namn/adress samt organisationsnummer för föreningen';end if;
  if fields->>'kind' not in ('sales','sponsor') or fields->>'kind' is null then raise exception 'Välj kund- eller sponsorfaktura';end if;
  pid:=nullif(fields->>'partner_id','')::uuid;
  if pid is not null and not exists(select 1 from public.club_econ_partners where id=pid and year=yr and kind='sponsor') then raise exception 'Kontrollera sponsorn och fakturaåret';end if;
 end if;
 if inv.id is null then
  insert into public.club_econ_invoices(payload,total,created_by) values(fields,gross,auth.uid()) returning * into inv;
 else
  update public.club_econ_invoices set payload=fields,total=gross,updated_at=clock_timestamp() where id=inv.id returning * into inv;
 end if;
 if action='issue' then
  select coalesce(max(number),0)+1 into num from public.club_econ_invoices where year=yr;
  fields:=fields||jsonb_build_object('invoice_no','FCK-'||yr||'-'||lpad(num::text,4,'0'),'net_total',net_total,'vat_total',vat_total,'total',gross);
  insert into public.club_econ_documents(name,path,kind,party,document_date,due_date,amount,reference,partner_id)
  values((fields->>'invoice_no')||'.pdf',inv.id::text||'/'||(fields->>'invoice_no')||'.pdf',fields->>'kind',fields->>'customer',dt,due,gross,fields->>'invoice_no',pid) returning id into doc;
  income:=case when fields->>'kind'='sponsor' then '3910' else '3990' end;
  lines:=jsonb_build_array(jsonb_build_object('account','1510','debit',gross,'credit',0),jsonb_build_object('account',income,'debit',0,'credit',net_total));
  if vat_total>0 then lines:=lines||jsonb_build_array(jsonb_build_object('account','2611','debit',0,'credit',vat_total));end if;
  entry:=public.club_econ_entry('post',jsonb_build_object('date',dt,'description','Kundfaktura '||(fields->>'invoice_no')||' · '||(fields->>'customer'),'document_id',doc,'partner_id',pid,'lines',lines));
  update public.club_econ_invoices set status='issued',year=yr,number=num,payload=fields,document_id=doc,journal_id=entry,issued_at=now(),updated_at=clock_timestamp() where id=inv.id returning * into inv;
 end if;
 insert into public.club_econ_audit(actor,action,entity,entity_id,detail) values(auth.uid(),action||'_invoice','invoice',inv.id,jsonb_build_object('invoice_no',inv.payload->>'invoice_no','total',gross,'status',inv.status));
 return to_jsonb(inv);
end $$;
revoke all on function public.club_econ_invoice(text,jsonb) from public,anon;
grant execute on function public.club_econ_invoice(text,jsonb) to authenticated;
-- Keep issued invoice evidence immutable even after reversing its journal.
create function public.club_econ_guard_issued_invoice_document() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if exists(select 1 from public.club_econ_invoices i where i.document_id=old.id and i.status='issued') then raise exception 'Utställd faktura måste bevaras';end if;
 if tg_op='DELETE' then return old;end if;return new;
end $$;
create trigger guard_issued_invoice_document before update or delete on public.club_econ_documents for each row execute function public.club_econ_guard_issued_invoice_document();
-- Existing snapshots already include allocation details. Add invoices to backups too.
alter function public.club_econ_snapshot() rename to club_econ_snapshot_settlements;
revoke all on function public.club_econ_snapshot_settlements() from public,anon;
create function public.club_econ_snapshot() returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Endast administratör';end if;
 return public.club_econ_snapshot_settlements()||jsonb_build_object('invoices',coalesce((select jsonb_agg(i order by i.created_at desc) from public.club_econ_invoices i),'[]'::jsonb));
end $$;
revoke all on function public.club_econ_snapshot() from public,anon;
grant execute on function public.club_econ_snapshot() to authenticated;
notify pgrst,'reload schema';
