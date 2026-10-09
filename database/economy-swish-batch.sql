create or replace function public.club_econ_income_batch(p_bank_ids uuid[],p_category text,p_note text,p_action text default 'save') returns jsonb
language plpgsql security definer set search_path='' as $$
declare b public.club_econ_bank; draft public.club_econ_journal; code text; eid uuid; ids jsonb:='[]';
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Endast administratör';end if;
 perform pg_catalog.pg_advisory_xact_lock(67677);
 code:=case p_category when 'kiosk' then '3054' when 'donation' then '3993' end;
 if code is null or p_action not in ('save','post') or p_action is null or coalesce(cardinality(p_bank_ids),0) not between 1 and 200 or length(trim(coalesce(p_note,''))) not between 3 and 200 then raise exception 'Kontrollera kategori, beskrivning och bankrader (högst 200)';end if;
 if (select count(distinct x) from unnest(p_bank_ids) x)<>cardinality(p_bank_ids) then raise exception 'Bankraden förekommer flera gånger';end if;
 for b in select * from public.club_econ_bank where id=any(p_bank_ids) order by date,id for update loop
   if b.amount<=0 then raise exception 'Välj endast inbetalningar';end if;
   if (select coalesce(sum(l.debit-l.credit),0) from public.club_econ_journal j join public.club_econ_lines l on l.journal_id=j.id where j.bank_id=b.id and j.status='posted' and l.account='1930')<>0 then raise exception 'En bankrad är redan bokförd. Uppdatera listan.';end if;
   select * into draft from public.club_econ_journal where bank_id=b.id and status='draft';
   if draft.id is not null and (draft.partner_id is not null or (draft.document_id is not null and draft.document_id is distinct from b.statement_document) or exists(select 1 from public.club_econ_document_links a where a.journal_id=draft.id) or exists(select 1 from public.club_econ_settlement_selections s where s.journal_id=draft.id and jsonb_array_length(s.payment_ids)>0)) then raise exception 'Bankraden har en faktura eller medlemsbetalning i sitt utkast. Öppna Stäm av.';end if;
   eid:=public.club_econ_entry(p_action,jsonb_build_object('id',draft.id,'date',b.date,'bank_id',b.id,'description',p_note||' · '||coalesce(b.reference,b.description,''),'income_allocations',jsonb_build_array(jsonb_build_object('category',p_category,'amount',b.amount)),'lines',jsonb_build_array(jsonb_build_object('account','1930','debit',b.amount,'credit',0),jsonb_build_object('account',code,'debit',0,'credit',b.amount))));
   ids:=ids||jsonb_build_array(eid);
 end loop;
 if jsonb_array_length(ids)<>cardinality(p_bank_ids) then raise exception 'En bankrad saknas';end if;
 return jsonb_build_object('count',jsonb_array_length(ids),'journal_ids',ids);
end $$;
revoke all on function public.club_econ_income_batch(uuid[],text,text,text) from public,anon;
grant execute on function public.club_econ_income_batch(uuid[],text,text,text) to authenticated;
notify pgrst,'reload schema';
