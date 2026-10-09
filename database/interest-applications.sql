-- Public intake deliberately permits anonymous submission, never reading applicants.
create table public.club_interest_applications (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null unique,
 created_at timestamptz not null default now(),
 player_name text not null check(length(player_name) between 1 and 160),
 birth_date date not null,
 team_id uuid references public.teams(id) on delete set null,
 contact_name text not null check(length(contact_name) between 1 and 160),
 contact_email text not null check(length(contact_email) between 3 and 254),
 contact_phone text not null check(length(contact_phone) between 5 and 30),
 previous_club text not null default '' check(length(previous_club)<=160),
 message text not null default '' check(length(message)<=2000),
 status text not null default 'new' check(status in ('new','contacted','closed')),
 admin_note text not null default '' check(length(admin_note)<=2000)
);
create index club_interest_created on public.club_interest_applications(created_at desc);
create index club_interest_email_created on public.club_interest_applications(contact_email,created_at desc);
alter table public.club_interest_applications enable row level security;
revoke all on public.club_interest_applications from anon,authenticated;
grant select on public.club_interest_applications to authenticated;
grant update(status,admin_note) on public.club_interest_applications to authenticated;
create policy interest_admin_read on public.club_interest_applications for select to authenticated using ((select public.is_admin()));
create policy interest_admin_update on public.club_interest_applications for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Only public team names and ids; no roster or contact data.
create function public.club_interest_teams() returns table(id uuid,name text)
language sql stable security definer set search_path='' as $$ select id,name from public.teams order by name $$;
revoke all on function public.club_interest_teams() from public;
grant execute on function public.club_interest_teams() to anon,authenticated;

create function public.club_submit_interest(request_id uuid,details jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare
 v_name text:=btrim(details->>'player_name');
 v_contact text:=btrim(details->>'contact_name');
 v_email text:=lower(btrim(details->>'contact_email'));
 v_phone text:=btrim(details->>'contact_phone');
 v_birth date; v_team uuid;
begin
 if request_id is null or jsonb_typeof(details) is distinct from 'object' or details->>'consent' is distinct from 'true' then raise exception 'Kontrollera uppgifterna och godkänn att klubben kontaktar dig.'; end if;
 if coalesce(details->>'website','')<>'' then return; end if;
 if coalesce(length(v_name),0) not between 1 and 160 or coalesce(length(v_contact),0) not between 1 and 160 then raise exception 'Ange spelarens namn och kontaktperson.'; end if;
 if v_email is null or length(v_email)>254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Ange en giltig e-postadress.'; end if;
 if v_phone is null or v_phone !~ '^\+?[0-9 ()-]{5,29}$' then raise exception 'Ange ett giltigt telefonnummer.'; end if;
 if length(coalesce(details->>'previous_club',''))>160 or length(coalesce(details->>'message',''))>2000 then raise exception 'Meddelandet är för långt.'; end if;
 begin v_birth:=(details->>'birth_date')::date; v_team:=nullif(details->>'team_id','')::uuid;
 exception when others then raise exception 'Kontrollera födelsedatum och lag.'; end;
 if v_birth is null or v_birth < date '1900-01-01' or v_birth>(now() at time zone 'Europe/Stockholm')::date then raise exception 'Kontrollera födelsedatum.'; end if;
 if v_team is not null and not exists(select 1 from public.teams where id=v_team) then raise exception 'Välj ett befintligt lag.'; end if;
 -- Serialize intake so concurrent requests cannot evade limits or create retries twice.
 perform pg_advisory_xact_lock(872136402);
 if exists(select 1 from public.club_interest_applications a where a.request_id=club_submit_interest.request_id) then return; end if;
 if (select count(*) from public.club_interest_applications where contact_email=v_email and created_at>now()-interval '1 hour')>=3 or
    (select count(*) from public.club_interest_applications where created_at>now()-interval '1 hour')>=300 then
  raise exception 'För många anmälningar just nu. Försök senare eller kontakta info@fckindmark.se.';
 end if;
 insert into public.club_interest_applications(request_id,player_name,birth_date,team_id,contact_name,contact_email,contact_phone,previous_club,message)
 values(request_id,v_name,v_birth,v_team,v_contact,v_email,v_phone,btrim(coalesce(details->>'previous_club','')),btrim(coalesce(details->>'message','')));
end $$;
revoke all on function public.club_submit_interest(uuid,jsonb) from public;
grant execute on function public.club_submit_interest(uuid,jsonb) to anon,authenticated;
