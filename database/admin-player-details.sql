-- Contacts share the player's existing access rules and team; no duplicate member.
alter table public.players
 add column if not exists email text,
 add column if not exists mother_name text,
 add column if not exists mother_phone text,
 add column if not exists father_name text,
 add column if not exists father_phone text;

create or replace function public.club_admin_save_player_details(target uuid, details jsonb)
returns public.players language plpgsql security invoker set search_path='' as $$
declare result public.players; value text; key text; birth integer; jersey integer; team uuid;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Endast administratörer kan ändra spelarens uppgifter.'; end if;
 if details is null or jsonb_typeof(details)<>'object' then raise exception 'Ogiltiga spelaruppgifter.'; end if;
 if nullif(trim(details->>'name'),'') is null or length(details->>'name')>160 then raise exception 'Ange spelarens namn (högst 160 tecken).'; end if;
 foreach key in array array['email','mother_email','father_email'] loop
  value:=nullif(trim(details->>key),'');
  if value is not null and (length(value)>254 or value !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then raise exception 'Ange en giltig e-postadress.'; end if;
 end loop;
 foreach key in array array['mother_phone','father_phone'] loop
  value:=nullif(trim(details->>key),'');
  if value is not null and value !~ '^\+?[0-9 ()-]{5,25}$' then raise exception 'Ange ett giltigt telefonnummer.'; end if;
 end loop;
 if length(coalesce(details->>'mother_name',''))>160 or length(coalesce(details->>'father_name',''))>160 then raise exception 'Förälderns namn är för långt.'; end if;
 birth:=nullif(details->>'birth_year','')::integer;
 jersey:=nullif(details->>'number','')::integer;
 team:=nullif(details->>'team_id','')::uuid;
 if birth is not null and (birth<1900 or birth>extract(year from current_date)) then raise exception 'Ange ett giltigt födelseår.'; end if;
 if jersey is not null and (jersey<0 or jersey>999) then raise exception 'Ange ett tröjnummer mellan 0 och 999.'; end if;
 if nullif(details->>'gender','') is not null and details->>'gender' not in ('boy','girl') then raise exception 'Ogiltigt kön.'; end if;
 if coalesce(details->>'membership_category','new') not in ('new','full') then raise exception 'Ogiltig medlemskategori.'; end if;
 if nullif(details->>'position','') is not null and details->>'position' not in ('Forward','Midfielder','Defender','Goalkeeper') then raise exception 'Ogiltig position.'; end if;
 update public.players set
  name=trim(details->>'name'),birth_year=birth,number=jersey,team_id=team,
  position=nullif(details->>'position',''),gender=nullif(details->>'gender',''),
  membership_category=coalesce(details->>'membership_category','new'),
  email=nullif(lower(trim(details->>'email')),''),
  mother_name=nullif(trim(details->>'mother_name'),''),mother_phone=nullif(trim(details->>'mother_phone'),''),mother_email=nullif(lower(trim(details->>'mother_email')),''),
  father_name=nullif(trim(details->>'father_name'),''),father_phone=nullif(trim(details->>'father_phone'),''),father_email=nullif(lower(trim(details->>'father_email')),'')
 where id=target returning * into result;
 if result.id is null then raise exception 'Spelaren kunde inte sparas.'; end if;
 -- Existing profile validation and permissions run in the same transaction.
 perform public.club_save_player_profile(target,details->>'mobile',details->>'clothing_size',nullif(details->>'shoe_size','')::numeric,details->>'telegram_username');
 return result;
end $$;
revoke all on function public.club_admin_save_player_details(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.club_admin_save_player_details(uuid,jsonb) to authenticated;
