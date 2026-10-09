-- Retire unused duplicate sales account; preserve posted clothing sales on 3903.
alter table public.club_econ_accounts add column if not exists active boolean not null default true;
update public.club_econ_accounts set active=false,name='Försäljning av kläder (äldre konto)' where code='3001';
update public.club_econ_accounts set name='Försäljning av kläder och utrustning' where code='3903';
update public.club_econ_accounts set name='Inköp av kläder och utrustning' where code='4010';
update public.club_econ_accounts set name='Kioskförsäljning' where code='3054';
notify pgrst,'reload schema';
