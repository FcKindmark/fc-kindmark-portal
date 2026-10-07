alter table public.payments add column if not exists due_date date;
alter table public.payments add column if not exists paid_date date;
alter table public.payments add column if not exists reference text;
alter table public.payments add constraint payments_valid_amount check(amount>0 and amount<=9999999999.99 and amount=round(amount,2)) not valid;
alter table public.payments add constraint payments_valid_status check(status in ('pending','paid')) not valid;
