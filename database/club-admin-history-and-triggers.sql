-- Administrators also see legacy attendance rows with missing references.
alter policy development_read on public.club_development using(public.is_admin() or public.club_owns_player(player_id) or exists(select 1 from public.players p where p.id=player_id and public.club_staff_team(p.team_id)));
alter policy attendance_read on public.club_attendance using(public.is_admin() or exists(select 1 from public.trainings t where t.id=training_id and public.club_staff_team(t.team_id)));
alter policy training_rsvp_read on public.training_attendance using(public.is_admin() or public.club_owns_player(player_id) or exists(select 1 from public.trainings t where t.id=training_id and public.club_staff_team(t.team_id)));
alter policy match_rsvp_read on public.match_attendance using(public.is_admin() or public.club_owns_player(player_id) or exists(select 1 from public.matches m where m.id=match_id and public.club_staff_team(m.team_id)));
-- Trigger functions are invoked by the database, never through the public API.
revoke execute on function public.handle_new_user(),public.rls_auto_enable() from public,anon,authenticated;
