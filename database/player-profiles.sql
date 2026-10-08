-- One editable contact/equipment profile per existing player; no second member record.
create table public.club_player_profiles (
 player_id uuid primary key references public.players(id) on delete cascade,
 mobile text check(mobile is null or mobile ~ '^\+?[0-9 ()-]{5,25}$'),
 clothing_size text check(clothing_size is null or clothing_size in ('104','110','116','122','128','134','140','146','152','158','164','170','176','XXS','XS','S','M','L','XL','XXL','3XL')),
 shoe_size numeric(3,1) check(shoe_size between 15 and 55),
 telegram_username text check(telegram_username is null or telegram_username ~ '^[A-Za-z][A-Za-z0-9_]{4,31}$'),
 updated_at timestamptz not null default now()
);
alter table public.club_player_profiles enable row level security;
revoke all on public.club_player_profiles from public,anon,authenticated;
grant select on public.club_player_profiles to authenticated;
create policy player_profile_read on public.club_player_profiles for select to authenticated using(
 public.is_admin() or public.club_owns_player(player_id) or exists(select 1 from public.players p where p.id=player_id and (
 public.club_staff_team(p.team_id) or lower(p.mother_email)=lower((select auth.jwt()->>'email')) or lower(p.father_email)=lower((select auth.jwt()->>'email'))))
);
create function public.club_save_player_profile(target uuid,p_mobile text,p_clothing_size text,p_shoe_size numeric,p_telegram_username text)
returns public.club_player_profiles language plpgsql security definer set search_path='' as $$
declare result public.club_player_profiles;
begin
 if auth.uid() is null then raise exception 'Logga in igen.'; end if;
 if not (public.is_admin() or public.club_owns_player(target) or exists(select 1 from public.players p where p.id=target and (
 lower(p.mother_email)=lower(auth.jwt()->>'email') or lower(p.father_email)=lower(auth.jwt()->>'email')))) then raise exception 'Du får inte ändra denna spelarprofil.'; end if;
 insert into public.club_player_profiles(player_id,mobile,clothing_size,shoe_size,telegram_username)
 values(target,nullif(trim(p_mobile),''),nullif(trim(p_clothing_size),''),p_shoe_size,nullif(ltrim(trim(p_telegram_username),'@'),''))
 on conflict(player_id) do update set mobile=excluded.mobile,clothing_size=excluded.clothing_size,shoe_size=excluded.shoe_size,telegram_username=excluded.telegram_username,updated_at=now()
 returning * into result;
 return result;
end $$;
revoke all on function public.club_save_player_profile(uuid,text,text,numeric,text) from public,anon,authenticated;
grant execute on function public.club_save_player_profile(uuid,text,text,numeric,text) to authenticated;
