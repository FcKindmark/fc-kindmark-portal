-- Discount codes use the existing stable short membership number.
-- Payment references and membership numbers are unchanged.
alter table public.club_member_cards alter column member_number drop default;
create function public.club_short_discount_code() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  new.member_number:='FCK-'||new.membership_no::text;
  return new;
end;
$$;
revoke all on function public.club_short_discount_code() from public,anon,authenticated;
create trigger short_discount_code before insert or update of membership_no,member_number
on public.club_member_cards for each row execute function public.club_short_discount_code();
update public.club_member_cards set member_number='FCK-'||membership_no::text;
alter table public.club_member_cards add constraint short_discount_code_matches_member
check(member_number='FCK-'||membership_no::text);
notify pgrst, 'reload schema';
