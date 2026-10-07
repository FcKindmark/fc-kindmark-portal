grant delete on public.parent_players,public.training_attendance,public.club_match_replies to authenticated;
create policy parent_players_delete on public.parent_players for delete to authenticated using(public.is_admin());
create policy training_answer_delete on public.training_attendance for delete to authenticated using(public.is_admin() or public.club_owns_player(player_id));
create policy match_answer_delete on public.club_match_replies for delete to authenticated using(public.is_admin() or public.club_owns_player(player_id));

create function public.club_delete_player(target uuid) returns boolean language plpgsql security invoker set search_path='' as $$
begin
  if not public.is_admin() then raise insufficient_privilege using message='Only administrators can delete players'; end if;
  perform 1 from public.players where id=target for update;
  if not found then return false; end if;
  delete from public.club_match_calls where player_id=target;
  delete from public.club_member_cards where player_id=target;
  delete from public.payments where player_id=target;
  delete from public.parent_players where player_id=target;
  delete from public.players where id=target;
  return found;
end $$;
create function public.club_delete_team(target uuid) returns boolean language plpgsql security invoker set search_path='' as $$
begin
  if not public.is_admin() then raise insufficient_privilege using message='Only administrators can delete teams'; end if;
  perform 1 from public.teams where id=target for update;
  if not found then return false; end if;
  update public.players set team_id=null where team_id=target;
  delete from public.trainings where team_id=target;
  delete from public.matches where team_id=target;
  delete from public.teams where id=target;
  return found;
end $$;
revoke all on function public.club_delete_player(uuid),public.club_delete_team(uuid) from public,anon;
grant execute on function public.club_delete_player(uuid),public.club_delete_team(uuid) to authenticated;
