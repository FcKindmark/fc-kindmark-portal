-- Club-specific migration, reviewed against the actual UUID schema.
create table public.club_player_access(user_id uuid not null references auth.users(id) on delete cascade,player_id uuid not null references public.players(id) on delete cascade,primary key(user_id,player_id));
create table public.club_attendance(training_id uuid not null references public.trainings(id) on delete cascade,player_id uuid not null references public.players(id) on delete cascade,present boolean not null,recorded_at timestamptz not null default now(),primary key(training_id,player_id));
create table public.club_equipment(id uuid primary key default gen_random_uuid(),player_id uuid not null references public.players(id) on delete cascade,size text not null check(length(trim(size))>0),package text not null check(package in ('basic','full')),status text not null check(status in ('ordered','received','delivered')),created_at timestamptz not null default now());
create table public.club_development(id uuid primary key default gen_random_uuid(),player_id uuid not null references public.players(id) on delete cascade,technical text not null,tactical text not null,physical text not null,psychological text not null,priorities text not null,goals text not null,review_date date not null,created_at timestamptz not null default now());
alter table public.payments add column player_id uuid references public.players(id) on delete restrict;
create index on public.club_player_access(player_id);
create index on public.club_equipment(player_id,created_at desc);
create index on public.club_development(player_id,created_at desc);
create index on public.players(team_id);
create index on public.payments(player_id);
create index on public.trainings(team_id);
create index on public.matches(team_id);
alter table public.training_attendance add constraint training_rsvp_unique unique(training_id,player_id);
alter table public.match_attendance add constraint match_rsvp_unique unique(match_id,player_id);
alter table public.players add constraint players_team_fk foreign key(team_id) references public.teams(id) on delete restrict;
alter table public.trainings add constraint trainings_team_fk foreign key(team_id) references public.teams(id) on delete restrict;
alter table public.training_attendance add constraint training_rsvp_training_fk foreign key(training_id) references public.trainings(id) on delete cascade,add constraint training_rsvp_player_fk foreign key(player_id) references public.players(id) on delete cascade;
alter table public.match_attendance add constraint match_rsvp_match_fk foreign key(match_id) references public.matches(id) on delete cascade,add constraint match_rsvp_player_fk foreign key(player_id) references public.players(id) on delete cascade;
create or replace function public.is_admin() returns boolean language sql stable security invoker set search_path='' as $$ select coalesce(auth.jwt()->'app_metadata'->>'club_role'='admin',false) $$;
create function public.club_staff_team(team uuid) returns boolean language sql stable security invoker set search_path='' as $$ select public.is_admin() or (coalesce(auth.jwt()->'app_metadata'->>'club_role'='coach',false) and coalesce(auth.jwt()->'app_metadata'->'club_team_ids','[]'::jsonb) ? team::text) $$;
create function public.club_owns_player(player uuid) returns boolean language sql stable security invoker set search_path='' as $$ select exists(select 1 from public.club_player_access a where a.user_id=auth.uid() and a.player_id=player) $$;
create function public.club_reads_team(team uuid) returns boolean language sql stable security invoker set search_path='' as $$ select public.club_staff_team(team) or exists(select 1 from public.players p where p.team_id=team and public.club_owns_player(p.id)) $$;
revoke all on function public.is_admin(),public.club_staff_team(uuid),public.club_owns_player(uuid),public.club_reads_team(uuid) from public,anon;
grant execute on function public.is_admin(),public.club_staff_team(uuid),public.club_owns_player(uuid),public.club_reads_team(uuid) to authenticated,service_role;
-- Replace the permissive legacy policies. Data is retained.
do $$ declare r record;begin for r in select tablename,policyname from pg_policies where schemaname='public' and tablename in ('profiles','players','teams','trainings','matches','payments','messages','training_attendance','match_attendance','parent_players') loop execute format('drop policy %I on public.%I',r.policyname,r.tablename);end loop;end $$;
do $$ declare name text;begin foreach name in array array['profiles','players','teams','trainings','matches','payments','messages','training_attendance','match_attendance','parent_players','club_player_access','club_attendance','club_equipment','club_development'] loop execute format('alter table public.%I enable row level security',name);execute format('revoke all on public.%I from anon,authenticated',name);end loop;end $$;
grant select on public.profiles to authenticated;
grant update(full_name) on public.profiles to authenticated;
grant select,insert,update,delete on public.players,public.teams,public.trainings,public.matches,public.payments,public.messages,public.training_attendance,public.match_attendance to authenticated;
grant select,insert,delete on public.club_player_access to authenticated;
grant select on public.parent_players to authenticated;
grant select,insert,update on public.club_attendance,public.club_equipment to authenticated;
grant select,insert on public.club_development to authenticated;
create policy profiles_read on public.profiles for select to authenticated using(id=(select auth.uid()) or public.is_admin());
create policy profiles_name on public.profiles for update to authenticated using(id=(select auth.uid()) or public.is_admin()) with check(id=(select auth.uid()) or public.is_admin());
create policy links_read on public.club_player_access for select to authenticated using(user_id=(select auth.uid()) or public.is_admin());
create policy links_add on public.club_player_access for insert to authenticated with check(public.is_admin());
create policy links_delete on public.club_player_access for delete to authenticated using(public.is_admin());
create policy legacy_links_read on public.parent_players for select to authenticated using(parent_id=(select auth.uid()) or public.is_admin());
create policy players_read on public.players for select to authenticated using(public.club_staff_team(team_id) or public.club_owns_player(id));
create policy players_add on public.players for insert to authenticated with check(public.is_admin());
create policy players_edit on public.players for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy players_delete on public.players for delete to authenticated using(public.is_admin());
create policy teams_read on public.teams for select to authenticated using(public.club_reads_team(id));
create policy teams_write on public.teams for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy trainings_read on public.trainings for select to authenticated using(public.club_reads_team(team_id));
create policy trainings_write on public.trainings for all to authenticated using(public.club_staff_team(team_id)) with check(public.club_staff_team(team_id));
create policy matches_read on public.matches for select to authenticated using(public.club_reads_team(team_id));
create policy matches_write on public.matches for all to authenticated using(public.club_staff_team(team_id)) with check(public.club_staff_team(team_id));
create policy payments_read on public.payments for select to authenticated using(public.is_admin() or public.club_owns_player(player_id));
create policy payments_write on public.payments for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy messages_read on public.messages for select to authenticated using(public.is_admin() or lower(recipient_email)=lower((select auth.jwt()->>'email')));
create policy messages_add on public.messages for insert to authenticated with check(public.is_admin());
create policy messages_edit on public.messages for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy messages_delete on public.messages for delete to authenticated using(public.is_admin() or lower(recipient_email)=lower((select auth.jwt()->>'email')));
create policy equipment_read on public.club_equipment for select to authenticated using(public.is_admin() or public.club_owns_player(player_id));
create policy equipment_add on public.club_equipment for insert to authenticated with check(public.is_admin());
create policy equipment_edit on public.club_equipment for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy development_read on public.club_development for select to authenticated using(public.club_owns_player(player_id) or exists(select 1 from public.players p where p.id=player_id and public.club_staff_team(p.team_id)));
create policy development_add on public.club_development for insert to authenticated with check(exists(select 1 from public.players p where p.id=player_id and public.club_staff_team(p.team_id)));
create policy attendance_read on public.club_attendance for select to authenticated using(exists(select 1 from public.trainings t where t.id=training_id and public.club_staff_team(t.team_id)));
create policy attendance_add on public.club_attendance for insert to authenticated with check(exists(select 1 from public.trainings t join public.players p on p.team_id=t.team_id where t.id=training_id and p.id=player_id and public.club_staff_team(t.team_id)));
create policy attendance_edit on public.club_attendance for update to authenticated using(exists(select 1 from public.trainings t where t.id=training_id and public.club_staff_team(t.team_id))) with check(exists(select 1 from public.trainings t join public.players p on p.team_id=t.team_id where t.id=training_id and p.id=player_id and public.club_staff_team(t.team_id)));
create policy training_rsvp_read on public.training_attendance for select to authenticated using(public.club_owns_player(player_id) or exists(select 1 from public.trainings t where t.id=training_id and public.club_staff_team(t.team_id)));
create policy training_rsvp_add on public.training_attendance for insert to authenticated with check(public.club_owns_player(player_id) and exists(select 1 from public.trainings t join public.players p on p.team_id=t.team_id where t.id=training_id and p.id=player_id));
create policy training_rsvp_edit on public.training_attendance for update to authenticated using(public.club_owns_player(player_id)) with check(public.club_owns_player(player_id) and exists(select 1 from public.trainings t join public.players p on p.team_id=t.team_id where t.id=training_id and p.id=player_id));
create policy match_rsvp_read on public.match_attendance for select to authenticated using(public.club_owns_player(player_id) or exists(select 1 from public.matches m where m.id=match_id and public.club_staff_team(m.team_id)));
create policy match_rsvp_add on public.match_attendance for insert to authenticated with check(public.club_owns_player(player_id) and exists(select 1 from public.matches m join public.players p on p.team_id=m.team_id where m.id=match_id and p.id=player_id));
create policy match_rsvp_edit on public.match_attendance for update to authenticated using(public.club_owns_player(player_id)) with check(public.club_owns_player(player_id) and exists(select 1 from public.matches m join public.players p on p.team_id=m.team_id where m.id=match_id and p.id=player_id));
-- Existing Auth accounts have no profile rows. Restore matching profile IDs.
insert into public.profiles(id,email,full_name,role)
 select id,email,coalesce(raw_user_meta_data->>'full_name',email),'parent' from auth.users
 on conflict(id) do nothing;
-- The known, confirmed club account is the administrator. Other accounts stay unprivileged.
update auth.users set raw_app_meta_data=coalesce(raw_app_meta_data,'{}'::jsonb)||'{"club_role":"admin"}'::jsonb
 where lower(email)='info@fckindmark.se' and email_confirmed_at is not null;
-- Preserve unambiguous legacy payment ownership; ambiguous names remain staff-only.
update public.payments pay set player_id=p.id from public.players p where pay.player_id is null
 and pay.player_name=p.name and (select count(*) from public.players p2 where p2.name=pay.player_name)=1;
-- Link only confirmed accounts whose email already matches a stored guardian email.
insert into public.club_player_access(user_id,player_id)
 select u.id,p.id from auth.users u join public.players p
 on lower(u.email)=lower(p.mother_email) or lower(u.email)=lower(p.father_email)
 where u.email_confirmed_at is not null on conflict do nothing;
