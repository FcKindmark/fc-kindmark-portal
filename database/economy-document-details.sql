-- Preserve source currency and conversion evidence without changing SEK ledger values.
alter table public.club_econ_documents
  add column source_currency text not null default 'SEK' check(source_currency ~ '^[A-Z]{3}$'),
  add column source_amount numeric(14,2) check(source_amount >= 0),
  add column is_proforma boolean not null default false,
  add column conversion_note text not null default '';
alter table public.club_econ_documents add constraint econ_foreign_conversion_evidence check(source_currency = 'SEK' or (source_amount is not null and source_amount > 0 and length(trim(conversion_note)) > 0));
notify pgrst, 'reload schema';
