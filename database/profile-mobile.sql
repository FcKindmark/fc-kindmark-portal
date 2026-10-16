alter table public.profiles add column if not exists mobile text;
alter table public.profiles add constraint profiles_mobile_format check (mobile is null or mobile ~ '^[+]?[0-9 ()-]{5,25}$');
grant update(mobile) on public.profiles to authenticated;