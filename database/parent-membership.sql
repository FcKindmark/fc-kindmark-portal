create or replace function public.club_link_parent_member(target uuid, child uuid, member_card_id uuid default null)
returns uuid language plpgsql security invoker set search_path='' as $$
declare account public.profiles%rowtype; card public.club_member_cards%rowtype;
begin
 if (select auth.uid()) is null or not public.is_admin() then raise insufficient_privilege using message='Endast administratörer kan koppla föräldrar.'; end if;
 select * into account from public.profiles where id=target for update;
 if not found then raise exception 'Välj ett registrerat föräldrakonto.'; end if;
 if account.role='player' then raise exception 'Spelarkonton kan inte kopplas som föräldrar. Använd ett separat föräldrakonto.'; end if;
 if not exists(select 1 from public.players where id=child) then raise exception 'Barnet finns inte.'; end if;
 if member_card_id is not null then
  select * into card from public.club_member_cards where id=member_card_id for update;
  if not found or card.player_id is not null or (card.user_id is not null and card.user_id<>target) then raise exception 'Välj förälderns eget medlemskort.'; end if;
  update public.club_member_cards set user_id=target where id=card.id;
 else
  select * into card from public.club_member_cards where user_id=target and player_id is null order by created_at,id limit 1 for update;
  if not found then
   insert into public.club_member_cards(name,user_id,membership_type,fee_plan)
   values(coalesce(nullif(trim(account.full_name),''),account.email),target,'member','new') returning * into card;
  end if;
 end if;
 insert into public.club_player_access(user_id,player_id) values(target,child) on conflict do nothing;
 return card.id;
end $$;
revoke all on function public.club_link_parent_member(uuid,uuid,uuid) from public,anon;
grant execute on function public.club_link_parent_member(uuid,uuid,uuid) to authenticated;
notify pgrst,'reload schema';
