grant delete on public.club_equipment,public.club_development,public.club_attendance to authenticated;
create policy equipment_delete on public.club_equipment for delete to authenticated using(public.is_admin());
create policy development_delete on public.club_development for delete to authenticated using(public.is_admin());
create policy attendance_delete on public.club_attendance for delete to authenticated using(public.is_admin());
