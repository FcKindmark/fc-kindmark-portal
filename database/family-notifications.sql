create table public.club_message_reads(user_id uuid not null references auth.users(id) on delete cascade,message_id uuid not null references public.messages(id) on delete cascade,read_at timestamptz not null default now(),primary key(user_id,message_id));
alter table public.club_message_reads enable row level security;
revoke all on public.club_message_reads from public,anon,authenticated;
grant select on public.club_message_reads to authenticated;
create policy message_reads_own on public.club_message_reads for select to authenticated using(user_id=(select auth.uid()));
create function public.club_read_message(target uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.messages m where m.id=target and lower(m.recipient_email)=lower(auth.jwt()->>'email')) then raise exception 'Meddelandet tillhör inte ditt konto.';end if;
 insert into public.club_message_reads(user_id,message_id) values(auth.uid(),target) on conflict do nothing;
end;$$;
revoke all on function public.club_read_message(uuid) from public,anon;
grant execute on function public.club_read_message(uuid) to authenticated;
create function public.club_message_targets() returns table(message_id uuid,event_kind text,event_id uuid) language sql stable security definer set search_path='' as $$
 select n.message_id,'training'::text,n.training_id from public.club_training_notices n join public.messages m on m.id=n.message_id where auth.uid() is not null and lower(m.recipient_email)=lower(auth.jwt()->>'email')
 union all
 select n.message_id,'match'::text,n.match_id from public.club_match_notices n join public.messages m on m.id=n.message_id where auth.uid() is not null and lower(m.recipient_email)=lower(auth.jwt()->>'email')
$$;
revoke all on function public.club_message_targets() from public,anon;
grant execute on function public.club_message_targets() to authenticated;
notify pgrst,'reload schema';
