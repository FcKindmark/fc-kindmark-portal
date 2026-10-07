create function public.club_set_member_fee_plan(target uuid,plan text,fee_year integer) returns boolean language plpgsql security invoker set search_path='' as $$
declare price numeric;
begin
 if not public.is_admin() then raise insufficient_privilege; end if;
 if plan not in ('new','full') then raise exception 'Invalid fee category'; end if;
 select case when plan='full' then full_amount else new_amount end into price from public.club_membership_prices where year=fee_year;
 if price is null and exists(select 1 from public.payments where member_id=target and membership_year=fee_year and payment_kind='membership' and status='pending') then raise exception 'Ange pris för denna kategori först'; end if;
 update public.club_member_cards set fee_plan=plan where id=target;
 if not found then return false; end if;
 if price is not null then
  update public.payments set amount=price,description='Medlemsavgift '||fee_year||' – '||case when plan='full' then 'Full medlem' else 'Ny medlem' end where member_id=target and membership_year=fee_year and payment_kind='membership' and status='pending';
 end if;
 perform public.club_create_member_fee(target,fee_year);
 return true;
end $$;
revoke all on function public.club_set_member_fee_plan(uuid,text,integer) from public,anon;
grant execute on function public.club_set_member_fee_plan(uuid,text,integer) to authenticated;
