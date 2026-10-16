CREATE OR REPLACE FUNCTION public.club_link_player_account(target uuid, player uuid, enabled boolean DEFAULT true)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare account_role text; account_email text; birth integer;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Endast administratörer kan koppla spelarkonton.';end if;
 if target is null or player is null or target=auth.uid() then raise exception 'Välj spelarens eget registrerade konto.';end if;
 select role,lower(trim(email)) into account_role,account_email from public.profiles where id=target for update;
 if not found then raise exception 'Spelaren registrerar ett konto först.';end if;
 if account_role in ('admin','coach') or exists(select 1 from auth.users where id=target and raw_app_meta_data->>'club_role'='admin') then raise exception 'Tränar- och administratörskonton kan inte ändras till spelarkonton.';end if;
 select birth_year into birth from public.players where id=player for update;
 if not found then raise exception 'Spelaren finns inte.';end if;
 if enabled then
   perform pg_advisory_xact_lock(hashtextextended(player::text, 2));
   if birth is null or birth<1900 or birth>extract(year from current_date)::integer then raise exception 'Ange ett giltigt födelseår.';end if;
   if birth>2012 and not exists(select 1 from auth.users where id=target and raw_app_meta_data->>'managed_player_id'=player::text) then raise exception 'Yngre spelare använder ett administrerat användarnamn.';end if;
   if exists(select 1 from auth.users where id=target and raw_app_meta_data->>'managed_player_id' is not null and raw_app_meta_data->>'managed_player_id'<>player::text) then raise exception 'Kontot tillhör en annan spelare.';end if;
   if exists(select 1 from auth.users where id=target and raw_app_meta_data->>'managed_player_id'=player::text) and exists(select 1 from public.club_player_access a join public.profiles p on p.id=a.user_id where a.player_id=player and a.user_id<>target and p.role='player') then raise exception 'Spelaren har redan ett eget konto.';end if;
   if account_email is null or account_email='' then raise exception 'Ange spelarens egen e-postadress.';end if;
   if exists(select 1 from public.players p where lower(trim(p.mother_email))=account_email or lower(trim(p.father_email))=account_email) then raise exception 'Adressen används som föräldrakonto. Använd spelarens egen e-postadress.';end if;
   if exists(select 1 from public.club_player_access where user_id=target and player_id<>player) then raise exception 'Kontot är kopplat till andra spelare. Använd ett separat spelarkonto.';end if;
   update public.profiles set role='player' where id=target;
   insert into public.club_player_access(user_id,player_id) values(target,player) on conflict do nothing;
 else
   if account_role<>'player' then raise exception 'Kontot är inte ett spelarkonto.';end if;
   delete from public.club_player_access where user_id=target and player_id=player;
   if not exists(select 1 from public.club_player_access where user_id=target) then update public.profiles set role='parent' where id=target;end if;
 end if;
end;
$function$
