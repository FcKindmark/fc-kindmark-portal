-- Players and guardians use the same portal, with distinct labels and accounts.
create function public.club_link_player_account(target uuid, player uuid, enabled boolean default true) returns void
language plpgsql security definer set search_path='' as $$
declare account_role text;
begin
 if not public.is_admin() then raise exception 'Endast administratörer kan koppla spelarkonton.';end if;
 if target is null or player is null or target=auth.uid() then raise exception 'Välj spelarens eget registrerade konto.';end if;
 select role into account_role from public.profiles where id=target for update;
 if not found then raise exception 'Spelaren registrerar ett konto först.';end if;
 if account_role in ('admin','coach') or exists(select 1 from auth.users where id=target and raw_app_meta_data->>'club_role'='admin') then raise exception 'Tränar- och administratörskonton kan inte ändras till spelarkonton.';end if;
 if not exists(select 1 from public.players where id=player) then raise exception 'Spelaren finns inte.';end if;
 if enabled then
   if exists(select 1 from public.club_player_access where user_id=target and player_id<>player) then raise exception 'Kontot är kopplat till andra spelare. Använd ett separat spelarkonto.';end if;
   update public.profiles set role='player' where id=target;
   insert into public.club_player_access(user_id,player_id) values(target,player) on conflict do nothing;
 else
   if account_role<>'player' then raise exception 'Kontot är inte ett spelarkonto.';end if;
   delete from public.club_player_access where user_id=target and player_id=player;
   if not exists(select 1 from public.club_player_access where user_id=target) then update public.profiles set role='parent' where id=target;end if;
 end if;
end;
$$;
revoke all on function public.club_link_player_account(uuid,uuid,boolean) from public,anon;
grant execute on function public.club_link_player_account(uuid,uuid,boolean) to authenticated;

create function public.club_single_player_account() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if exists(select 1 from public.profiles where id=new.user_id and role='player') and
    exists(select 1 from public.club_player_access where user_id=new.user_id and player_id<>new.player_id)
 then raise exception 'Ett spelarkonto kan bara vara kopplat till spelarens egen profil.';end if;
 return new;
end;
$$;
revoke all on function public.club_single_player_account() from public,anon,authenticated;
create trigger single_player_account before insert or update on public.club_player_access
for each row execute function public.club_single_player_account();
notify pgrst, 'reload schema';
