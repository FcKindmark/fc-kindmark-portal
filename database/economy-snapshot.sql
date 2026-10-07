create function public.club_econ_snapshot() returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Endast administratör';end if;
 select jsonb_build_object(
 'accounts',coalesce((select jsonb_agg(a order by a.code) from public.club_econ_accounts a),'[]'::jsonb),
 'partners',coalesce((select jsonb_agg(a order by a.created_at desc,a.id) from public.club_econ_partners a),'[]'::jsonb),
 'documents',coalesce((select jsonb_agg(a order by a.created_at desc,a.id) from public.club_econ_documents a),'[]'::jsonb),
 'bank',coalesce((select jsonb_agg(a order by a.date,a.id) from public.club_econ_bank a),'[]'::jsonb),
 'years',coalesce((select jsonb_agg(a order by a.year) from public.club_econ_years a),'[]'::jsonb),
 'journal',coalesce((select jsonb_agg(a order by a.date desc,a.number desc) from public.club_econ_journal a),'[]'::jsonb),
 'lines',coalesce((select jsonb_agg(a order by a.journal_id,a.id) from public.club_econ_lines a),'[]'::jsonb),
 'payment_links',coalesce((select jsonb_agg(a) from public.club_econ_payment_links a),'[]'::jsonb),
 'audit',coalesce((select jsonb_agg(a order by a.at desc,a.id desc) from (select * from public.club_econ_audit order by at desc,id desc limit 100) a),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.club_econ_snapshot() from public,anon;
grant execute on function public.club_econ_snapshot() to authenticated;
