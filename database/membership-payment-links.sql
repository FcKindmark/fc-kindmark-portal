alter table public.club_member_cards add column membership_no bigint generated always as identity (start with 1001);
alter table public.club_member_cards add constraint club_membership_no_unique unique(membership_no);
alter table public.payments add column member_id uuid references public.club_member_cards(id) on delete set null;
alter table public.payments add column membership_no bigint;
alter table public.payments add column membership_year integer check(membership_year between 1900 and 2200);
alter table public.payments add column payment_kind text not null default 'other' check(payment_kind in ('membership','other'));
alter table public.payments add column payer_name text;
alter table public.payments add column bank_message text;
do $$ begin execute format('grant usage on sequence %s to authenticated',pg_get_serial_sequence('public.club_member_cards','membership_no')); end $$;
