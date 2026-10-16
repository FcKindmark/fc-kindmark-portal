alter table public.payments add column payment_category text
 check(payment_category in ('clothing','training','equipment','other'));
comment on column public.payments.payment_category is 'Category for non-membership charges. Existing payment_kind membership remains authoritative. Null legacy charges display as other.';
notify pgrst,'reload schema';
