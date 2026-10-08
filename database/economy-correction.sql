-- Atomic correction: reversal and replacement either both commit or both roll back.
create or replace function public.club_econ_correct(p_original uuid, p_reason text, p_replacement jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare original public.club_econ_journal; corrected uuid;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Endast administratör'; end if;
 perform pg_advisory_xact_lock(67677);
 select * into original from public.club_econ_journal where id=p_original;
 if not found or original.status<>'posted' then raise exception 'Bokförd verifikation saknas'; end if;
 perform public.club_econ_entry('reverse',jsonb_build_object('id',p_original,'date',original.date,'reason',p_reason));
 corrected:=public.club_econ_entry('post',(p_replacement-'id'-'correction_of'-'reason'-'status'-'number'-'year'-'reversal_of') || jsonb_build_object('bank_id',original.bank_id));
 return corrected;
end $$;
revoke all on function public.club_econ_correct(uuid,text,jsonb) from public,anon;
grant execute on function public.club_econ_correct(uuid,text,jsonb) to authenticated;

create or replace function public.club_econ_bank_draft(p_bank uuid, p_proposal jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare bank public.club_econ_bank; existing uuid; posted numeric;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Endast administratör'; end if;
 perform pg_advisory_xact_lock(67677);
 select * into bank from public.club_econ_bank where id=p_bank;
 if not found then raise exception 'Bankraden saknas';end if;
 select id into existing from public.club_econ_journal where bank_id=p_bank and status='draft' limit 1;
 if existing is not null then return null;end if;
 select coalesce(sum(l.debit-l.credit),0) into posted from public.club_econ_journal j join public.club_econ_lines l on l.journal_id=j.id where j.bank_id=p_bank and j.status='posted' and l.account='1930';
 if posted=bank.amount then return null;end if;
 return public.club_econ_entry('save',(p_proposal-'id') || jsonb_build_object('bank_id',p_bank,'date',bank.date,'document_id',bank.statement_document));
end $$;
revoke all on function public.club_econ_bank_draft(uuid,jsonb) from public,anon;
grant execute on function public.club_econ_bank_draft(uuid,jsonb) to authenticated;
