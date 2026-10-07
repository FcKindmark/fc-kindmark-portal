alter table public.club_member_cards add column membership_type text not null default 'member' check (membership_type in ('member','supporter'));
create function public.club_supporter() returns boolean language sql stable security invoker set search_path='' as $$
  select exists(select 1 from public.club_member_cards c where c.user_id=(select auth.uid()) and c.membership_type='supporter' and c.status='active');
$$;
revoke all on function public.club_supporter() from public,anon;
grant execute on function public.club_supporter() to authenticated;
create policy supporter_matches_read on public.matches for select to authenticated using (public.club_supporter());

create table public.club_news (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title))>0),
  body text not null check (length(trim(body))>0),
  published boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.club_news enable row level security;
revoke all on public.club_news from anon,authenticated;
grant select,insert,update,delete on public.club_news to authenticated;
create policy club_news_read on public.club_news for select to authenticated using(published or public.is_admin());
create policy club_news_add on public.club_news for insert to authenticated with check(public.is_admin());
create policy club_news_edit on public.club_news for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy club_news_remove on public.club_news for delete to authenticated using(public.is_admin());
