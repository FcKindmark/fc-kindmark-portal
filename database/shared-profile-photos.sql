alter table public.players add column avatar_path text;
alter table public.players add constraint players_avatar_path check(avatar_path is null or (avatar_path like 'players/'||id::text||'/%' and length(avatar_path)<180));
grant update(avatar_path) on public.players to authenticated;
create policy player_photos_add on storage.objects for insert to authenticated
with check(bucket_id='club-profile-photos' and public.is_admin() and (storage.foldername(name))[1]='players' and exists(select 1 from public.players p where p.id::text=(storage.foldername(name))[2]));
create policy player_photos_delete on storage.objects for delete to authenticated
using(bucket_id='club-profile-photos' and public.is_admin() and (storage.foldername(name))[1]='players');
-- Keep portraits private; expose only identities already visible to the viewer.
create function public.club_can_view_profile_photo(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (target=auth.uid() or public.is_admin() or
 exists(select 1 from public.club_coach_teams c where c.user_id=target and
 (public.club_staff_team(c.team_id) or exists(select 1 from public.players s
 where s.team_id=c.team_id and public.club_owns_player(s.id)))))
$$;
revoke all on function public.club_can_view_profile_photo(uuid) from public,anon;
grant execute on function public.club_can_view_profile_photo(uuid) to authenticated;
create function public.club_can_read_portrait_path(object_name text) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (exists(select 1 from public.profiles p where p.avatar_path=object_name and public.club_can_view_profile_photo(p.id))
 or exists(select 1 from public.players s where s.avatar_path=object_name and (public.club_staff_team(s.team_id) or public.club_owns_player(s.id))))
$$;
revoke all on function public.club_can_read_portrait_path(text) from public,anon;
grant execute on function public.club_can_read_portrait_path(text) to authenticated;
create policy profile_photos_visible_people on storage.objects for select to authenticated
using(bucket_id='club-profile-photos' and public.club_can_read_portrait_path(name));
-- The metadata lookup avoids granting broad access to account/email records.
create function public.club_visible_portraits() returns table(kind text,person_id uuid,path text)
language sql stable security definer set search_path='' as $$
 select 'profile'::text,p.id,p.avatar_path from public.profiles p
 where p.avatar_path is not null and public.club_can_view_profile_photo(p.id)
 union all
 select 'player'::text,s.id,s.avatar_path from public.players s
 where s.avatar_path is not null and auth.uid() is not null
 and (public.club_staff_team(s.team_id) or public.club_owns_player(s.id))
$$;
revoke all on function public.club_visible_portraits() from public,anon;
grant execute on function public.club_visible_portraits() to authenticated;
notify pgrst,'reload schema';

alter table public.matches add column venue_type text check(venue_type in ('hemma','borta'));
update public.matches set venue_type=lower(substring(admin_comment from '^\s*(Hemma|Borta)')) where admin_comment ~* '^\s*(Hemma|Borta)\y';
notify pgrst,'reload schema';
