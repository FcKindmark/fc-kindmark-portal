alter table public.matches add column club_score smallint check (club_score >= 0);
alter table public.matches add column opponent_score smallint check (opponent_score >= 0);
alter table public.matches add constraint match_scores_complete check ((club_score is null) = (opponent_score is null));

create table public.club_match_calls (
  match_id uuid references public.matches(id) on delete cascade,
  player_id uuid references public.players(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (match_id,player_id)
);
create table public.club_match_replies (
  match_id uuid not null,
  player_id uuid not null,
  attending boolean not null,
  primary key (match_id,player_id),
  foreign key (match_id,player_id) references public.club_match_calls(match_id,player_id) on delete cascade
);
alter table public.club_match_calls enable row level security;
alter table public.club_match_replies enable row level security;
revoke all on public.club_match_calls, public.club_match_replies from anon, authenticated;
grant select,insert,delete on public.club_match_calls to authenticated;
grant select,insert,update on public.club_match_replies to authenticated;

create policy match_calls_read on public.club_match_calls for select to authenticated using (
  public.club_owns_player(player_id) or exists(select 1 from public.matches m where m.id=match_id and public.club_staff_team(m.team_id))
);
create policy match_calls_add on public.club_match_calls for insert to authenticated with check (
  exists(select 1 from public.matches m join public.players p on p.team_id=m.team_id where m.id=match_id and p.id=player_id and public.club_staff_team(m.team_id))
);
create policy match_calls_remove on public.club_match_calls for delete to authenticated using (
  exists(select 1 from public.matches m where m.id=match_id and public.club_staff_team(m.team_id))
);
create policy match_replies_read on public.club_match_replies for select to authenticated using (
  public.club_owns_player(player_id) or exists(select 1 from public.matches m where m.id=match_id and public.club_staff_team(m.team_id))
);
create policy match_replies_add on public.club_match_replies for insert to authenticated with check (
  public.club_owns_player(player_id) and exists(select 1 from public.club_match_calls c join public.matches m on m.id=c.match_id join public.players p on p.team_id=m.team_id where c.match_id=club_match_replies.match_id and c.player_id=club_match_replies.player_id and p.id=c.player_id)
);
create policy match_replies_edit on public.club_match_replies for update to authenticated using (public.club_owns_player(player_id)) with check (
  public.club_owns_player(player_id) and exists(select 1 from public.club_match_calls c join public.matches m on m.id=c.match_id join public.players p on p.team_id=m.team_id where c.match_id=club_match_replies.match_id and c.player_id=club_match_replies.player_id and p.id=c.player_id)
);
