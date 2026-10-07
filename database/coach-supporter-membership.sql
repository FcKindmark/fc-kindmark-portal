-- Coach permissions and supporter membership coexist. Removing coaching access
-- does not remove the account, parent links, membership card, or payment history.
create function public.club_coach_membership() returns trigger
language plpgsql security invoker set search_path='' as $$
declare card uuid;fee_year integer:=extract(year from current_timestamp at time zone 'Europe/Stockholm')::integer;
begin
  if new.role<>'coach' then return new;end if;
  if not public.is_admin() then raise insufficient_privilege;end if;
  select id into card from public.club_member_cards where user_id=new.id and player_id is null order by created_at limit 1;
  if card is null then
    insert into public.club_member_cards(name,user_id,membership_type)
      values(coalesce(nullif(trim(new.full_name),''),new.email),new.id,'supporter') returning id into card;
  else
    update public.club_member_cards set membership_type='supporter',status='active' where id=card;
  end if;
  -- Existing paid transactions retain their recorded amount and evidence.
  update public.payments set amount=150,description='Medlemsavgift '||fee_year||' – Stödmedlem'
    where member_id=card and membership_year=fee_year and payment_kind='membership' and status='pending';
  perform public.club_create_member_fee(card,fee_year);
  return new;
end;
$$;
revoke all on function public.club_coach_membership() from public,anon,authenticated;
create trigger coach_supporter_membership after update of role on public.profiles
for each row when(new.role='coach') execute function public.club_coach_membership();
