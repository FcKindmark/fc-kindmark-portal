create or replace function public.club_correct_player_payment(p_original uuid,p_source uuid,p_target uuid,p_move_equipment boolean default false)
returns uuid language plpgsql security invoker set search_path='' as $$
declare j public.club_econ_journal; b public.club_econ_bank; src public.payments; dst public.payments; card public.club_member_cards; target_name text; clothing uuid; corrected uuid; lines jsonb;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Endast administratör';end if;
 if p_source is null or p_target is null or p_source=p_target then raise exception 'Välj två olika spelare';end if;
 perform pg_advisory_xact_lock(67677);
 select * into j from public.club_econ_journal where id=(select l.journal_id from public.club_econ_payment_links l join public.club_econ_journal h on h.id=l.journal_id where l.payment_id=p_original and h.status='posted' and not exists(select 1 from public.club_econ_journal r where r.reversal_of=h.id)) for update;
 if not found or j.status<>'posted' or j.reversal_of is not null or exists(select 1 from public.club_econ_journal where reversal_of=j.id) then raise exception 'Verifikationen saknas eller är redan rättad';end if;
 select * into b from public.club_econ_bank where id=j.bank_id;
 if not found or b.amount<>850 then raise exception 'Denna rättelse gäller inbetalning 850 SEK (50 medlemsavgift och 800 träningskläder)';end if;
 if (select count(*) from public.club_econ_payment_links where journal_id=j.id)<>1 then raise exception 'Kontrollera betalningskopplingarna i Ekonomi';end if;
 select p.* into src from public.payments p join public.club_econ_payment_links l on l.payment_id=p.id where l.journal_id=j.id and p.player_id=p_source and p.payment_kind='membership' and p.amount=50 and p.status='paid' for update of p;
 if not found then raise exception 'Den betalda medlemsavgiften kunde inte verifieras';end if;
 select name into target_name from public.players where id=p_target;
 if not found then raise exception 'Mottagande spelare saknas';end if;
 if (select count(*) from public.club_member_cards where player_id=p_target)<>1 then raise exception 'Mottagaren måste ha ett medlemskort';end if;
 select * into card from public.club_member_cards where player_id=p_target for update;
 select * into dst from public.payments where member_id=card.id and membership_year=src.membership_year and payment_kind='membership' for update;
 if not found or dst.status<>'pending' or dst.amount<>50 or dst.player_id<>p_target then raise exception 'Mottagaren måste ha en obetald medlemsavgift på 50 SEK för samma år';end if;
 if exists(select 1 from public.club_econ_payment_links l join public.club_econ_journal h on h.id=l.journal_id where l.payment_id=dst.id and not exists(select 1 from public.club_econ_journal r where r.reversal_of=h.id)) then raise exception 'Mottagarens avgift är redan bokförd';end if;
 if exists(select 1 from public.payments where player_id=p_target and amount=800 and payment_category='clothing') then raise exception 'Mottagaren har redan en klädpost på 800 SEK. Kontrollera den först';end if;
 if (select count(*) from public.club_econ_lines where journal_id=j.id)<>3 or not exists(select 1 from public.club_econ_lines where journal_id=j.id and account='1930' and debit=850 and credit=0) or not exists(select 1 from public.club_econ_lines where journal_id=j.id and account='3901' and credit=50 and debit=0) or not exists(select 1 from public.club_econ_lines where journal_id=j.id and account='3903' and credit=800 and debit=0) then raise exception 'Konteringen stämmer inte med 50 + 800 SEK';end if;
 select jsonb_agg(jsonb_build_object('account',account,'debit',debit,'credit',credit)) into lines from public.club_econ_lines where journal_id=j.id;
 perform public.club_econ_entry('reverse',jsonb_build_object('id',j.id,'date',j.date,'reason','Fel spelare. Inbetalningen tillhör '||target_name));
 insert into public.payments(player_id,player_name,member_id,membership_no,amount,description,status,payment_kind,payment_category,reference,bank_message)
 values(p_target,target_name,card.id,card.membership_no,800,'Träningskläder','pending','other','clothing',card.membership_no::text||'-'||src.membership_year::text||'-KLADER','Rättelse av spelarkoppling från verifikation '||j.number::text||'/'||j.year::text)
 returning id into clothing;
 corrected:=public.club_econ_entry('post',jsonb_build_object('date',j.date,'description',j.description||' · Rätt spelare: '||target_name,'type',j.type,'bank_id',j.bank_id,'document_id',j.document_id,'partner_id',j.partner_id,'lines',lines,'payment_ids',jsonb_build_array(dst.id,clothing)));
 if p_move_equipment then update public.club_equipment set player_id=p_target where player_id=p_source;end if;
 return corrected;
end $$;
revoke all on function public.club_correct_player_payment(uuid,uuid,uuid,boolean) from public,anon;
grant execute on function public.club_correct_player_payment(uuid,uuid,uuid,boolean) to authenticated;