-- Preserve existing user-assigned partner payments as invoice associations.
-- Only an unambiguous full payment with the same assigned partner is linked.
-- No journal, bank transaction or payment status is changed.
with candidates as (
 select j.id journal_id,d.id document_id,d.amount,l.account,
 count(*) over(partition by j.id) journal_matches,
 count(*) over(partition by d.id) document_matches
 from public.club_econ_journal j
 join public.club_econ_documents d on d.partner_id=j.partner_id
 join public.club_econ_bank b on b.id=j.bank_id
 join public.club_econ_lines l on l.journal_id=j.id and l.account in ('3910','3980','3990') and l.credit=d.amount and l.debit=0
 where j.status='posted' and j.reversal_of is null and j.partner_id is not null
 and d.kind in ('sponsor','grant') and not d.is_proforma and d.amount>0
 and b.amount=d.amount and b.date>=d.document_date and extract(year from d.document_date)=j.year
 and (j.document_id is null or exists(select 1 from public.club_econ_documents s where s.id=j.document_id and s.kind='statement'))
 and (select count(*) from public.club_econ_lines x where x.journal_id=j.id)=2
 and exists(select 1 from public.club_econ_lines x where x.journal_id=j.id and x.account='1930' and x.debit=d.amount and x.credit=0)
 and not exists(select 1 from public.club_econ_journal x where x.reversal_of=j.id)
 and not exists(select 1 from public.club_econ_payment_links x where x.journal_id=j.id)
 and not exists(select 1 from public.club_econ_document_links x where x.journal_id=j.id or x.document_id=d.id)
 and (select count(*) from public.club_econ_documents x where x.partner_id=d.partner_id and x.kind in ('sponsor','grant') and not x.is_proforma and extract(year from x.document_date)=j.year)=1
), restored as (
 insert into public.club_econ_document_links(journal_id,document_id,amount,account)
 select journal_id,document_id,amount,account from candidates where journal_matches=1 and document_matches=1
 on conflict do nothing returning *
)
insert into public.club_econ_audit(actor,action,entity,entity_id,detail)
select null,'restore_invoice_link','journal',journal_id,jsonb_build_object('source','existing admin-assigned partner payment','document_id',document_id,'amount',amount,'account',account,'ledger_changed',false) from restored;
