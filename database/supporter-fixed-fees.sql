create or replace function public.club_create_member_fee(target uuid,fee_year integer) returns boolean language plpgsql security invoker set search_path='' as $$
declare m public.club_member_cards%rowtype; prices public.club_membership_prices%rowtype; price numeric;
begin
 if not public.is_admin() then raise insufficient_privilege; end if;
 select * into m from public.club_member_cards where id=target and (player_id is not null or membership_type='supporter') and status='active';
 if not found then return false; end if;
 select * into prices from public.club_membership_prices where year=fee_year;
 if m.membership_type='supporter' then price:=150; else price:=case when m.fee_plan='full' then prices.full_amount else prices.new_amount end; end if;
 if price is null then return false; end if;
 insert into public.payments(player_name,player_id,member_id,membership_no,membership_year,payment_kind,amount,status,description,swish,bankgiro,reference,due_date)
 values(m.name,m.player_id,m.id,m.membership_no,fee_year,'membership',price,'pending','Medlemsavgift '||fee_year||' – '||case when m.membership_type='supporter' then 'Stödmedlem' when m.fee_plan='full' then 'Full medlem' else 'Ny medlem' end,'1230830323','5246-1142',m.membership_no::text||'-'||fee_year,prices.due_date)
 on conflict(member_id,membership_year) where payment_kind='membership' and member_id is not null do nothing;
 return found;
end $$;
create or replace function public.club_generate_member_fees(fee_year integer) returns integer language plpgsql security invoker set search_path='' as $$
declare m record; made integer:=0;
begin
 if not public.is_admin() then raise insufficient_privilege; end if;
 insert into public.club_member_cards(name,player_id,membership_type) select p.name,p.id,'member' from public.players p where not exists(select 1 from public.club_member_cards c where c.player_id=p.id) on conflict(player_id) where player_id is not null do nothing;
 for m in select id from public.club_member_cards where (player_id is not null or membership_type='supporter') and status='active' loop
  if public.club_create_member_fee(m.id,fee_year) then made:=made+1; end if;
 end loop;
 return made;
end $$;

create function public.club_supporter_fee_on_card() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.membership_type='supporter' and new.status='active' then perform public.club_create_member_fee(new.id,extract(year from current_timestamp at time zone 'Europe/Stockholm')::integer); end if;
 return new;
end $$;
create trigger supporter_fee_on_card after insert or update of membership_type,status on public.club_member_cards for each row execute function public.club_supporter_fee_on_card();
revoke all on function public.club_supporter_fee_on_card() from public,anon,authenticated;
create function public.club_fixed_supporter_fee() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.payment_kind='membership' and exists(select 1 from public.club_member_cards c where c.id=new.member_id and c.membership_type='supporter') and new.amount<>150 then raise exception 'Stödmedlemsavgiften är alltid 150 SEK'; end if;
 return new;
end $$;
create trigger fixed_supporter_fee before insert or update on public.payments for each row execute function public.club_fixed_supporter_fee();
revoke all on function public.club_fixed_supporter_fee() from public,anon,authenticated;
create policy member_own_fee_read on public.payments for select to authenticated using(exists(select 1 from public.club_member_cards c where c.id=member_id and c.user_id=(select auth.uid())));
