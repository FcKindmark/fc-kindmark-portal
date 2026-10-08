-- Coaches assigned to the event team are included in every new kallelse.
create table public.club_coach_calls(
 training_id uuid references public.trainings(id) on delete cascade,
 match_id uuid references public.matches(id) on delete cascade,
 coach_id uuid not null references public.profiles(id) on delete cascade,
 event_kind text generated always as (case when training_id is not null then 'training' else 'match' end) stored,
 event_id uuid generated always as (coalesce(training_id,match_id)) stored,
 attending boolean,updated_at timestamptz,
 check(num_nonnulls(training_id,match_id)=1),primary key(event_kind,event_id,coach_id)
);
alter table public.club_coach_calls enable row level security;
revoke all on public.club_coach_calls from public,anon,authenticated;
grant select on public.club_coach_calls to authenticated;
create policy coach_calls_staff_read on public.club_coach_calls for select to authenticated using(
 exists(select 1 from public.trainings t where t.id=training_id and public.club_staff_team(t.team_id)) or
 exists(select 1 from public.matches m where m.id=match_id and public.club_staff_team(m.team_id)));
create or replace function public.club_send_training_call(target uuid,selected uuid[],note text default '') returns jsonb language plpgsql security definer set search_path='' as $$
declare activity public.trainings;team_label text;recipient record;message uuid;recipients text[]:='{}';sent integer:=0;
begin
 select * into activity from public.trainings where id=target for update;
 if not found or not public.club_staff_team(activity.team_id) then raise exception 'Du kan bara kalla spelare till dina egna lags träningar.';end if;
 if selected is null or cardinality(selected)=0 then raise exception 'Välj minst en spelare.';end if;
 if length(coalesce(note,''))>1000 then raise exception 'Meddelandet får vara högst 1000 tecken.';end if;
 if exists(select 1 from unnest(selected) x where x is null or not exists(select 1 from public.players p where p.id=x and p.team_id=activity.team_id)) then raise exception 'Välj spelare från träningens lag.';end if;
 delete from public.club_coach_calls where training_id=target and not exists(select 1 from public.club_coach_teams c where c.user_id=coach_id and c.team_id=activity.team_id);
 insert into public.club_coach_calls(training_id,coach_id) select target,c.user_id from public.club_coach_teams c where c.team_id=activity.team_id on conflict do nothing;
 delete from public.club_training_calls where training_id=target and not(player_id=any(selected));
 insert into public.club_training_calls(training_id,player_id) select target,x from (select distinct unnest(selected) x)s on conflict do nothing;
 update public.trainings set calls_sent_at=now() where id=target;
 select name into team_label from public.teams where id=activity.team_id;
 for recipient in
 with contacts as (
 select p.id,p.name,lower(trim(p.mother_email)) email from public.players p where p.id=any(selected)
 union select p.id,p.name,lower(trim(p.father_email)) from public.players p where p.id=any(selected)
 union select p.id,p.name,lower(trim(a.email)) from public.players p join public.club_player_access l on l.player_id=p.id join public.profiles a on a.id=l.user_id where p.id=any(selected)
 union select a.id,coalesce(nullif(a.full_name,''),'Tränare'),lower(trim(a.email)) from public.profiles a join public.club_coach_teams c on c.user_id=a.id where c.team_id=activity.team_id)
 select email,string_agg(distinct name,', ' order by name) names from contacts where email is not null and email<>'' group by email
 loop
 recipients:=array_append(recipients,recipient.email);
 select message_id into message from public.club_training_notices where training_id=target and recipient_email=recipient.email;
 if message is null then
 insert into public.messages(recipient_email,subject,content,sender_email,status,team_name) values(recipient.email,'Kallelse till träning – '||team_label,
 'Hej! '||recipient.names||' är kallad till träning med '||team_label||'. Datum: '||activity.date::text||' kl '||to_char(activity.time,'HH24:MI')||'. Plats: '||coalesce(activity.location,'')||'. '||coalesce(nullif(trim(note),''),'')||' Öppna Kallelser i portalen och svara Kommer eller Kommer inte.',auth.jwt()->>'email','sent',team_label) returning id into message;
 insert into public.club_training_notices values(target,recipient.email,message);
 else
 update public.messages set subject='Kallelse till träning – '||team_label,content='Hej! '||recipient.names||' är kallad till träning med '||team_label||'. Datum: '||activity.date::text||' kl '||to_char(activity.time,'HH24:MI')||'. Plats: '||coalesce(activity.location,'')||'. '||coalesce(nullif(trim(note),''),'')||' Öppna Kallelser i portalen och svara Kommer eller Kommer inte.',sender_email=auth.jwt()->>'email',team_name=team_label where id=message;
 end if;sent:=sent+1;
 end loop;
 delete from public.messages where id in(select message_id from public.club_training_notices where training_id=target and not(recipient_email=any(recipients)));
 return jsonb_build_object('players',(select count(*) from public.club_training_calls where training_id=target),'recipients',sent,'coaches',(select count(*) from public.club_coach_calls where training_id=target));
end;$$;
revoke all on function public.club_send_training_call(uuid,uuid[],text) from public,anon;
grant execute on function public.club_send_training_call(uuid,uuid[],text) to authenticated;

create or replace function public.club_send_match_call(target uuid,selected uuid[],note text default '') returns jsonb language plpgsql security definer set search_path='' as $$
declare activity public.matches;team_label text;recipient record;message uuid;recipients text[]:='{}';sent integer:=0;
begin
 select * into activity from public.matches where id=target for update;
 if auth.uid() is null or not found or not public.club_staff_team(activity.team_id) then raise exception 'Du kan bara kalla spelare till dina egna lags matcher.';end if;
 if selected is null or cardinality(selected)=0 then raise exception 'Välj minst en spelare.';end if;
 if length(coalesce(note,''))>1000 then raise exception 'Meddelandet får vara högst 1000 tecken.';end if;
 if exists(select 1 from unnest(selected) x where x is null or not exists(select 1 from public.players p where p.id=x and p.team_id=activity.team_id)) then raise exception 'Välj spelare från matchens lag.';end if;
 delete from public.club_coach_calls where match_id=target and not exists(select 1 from public.club_coach_teams c where c.user_id=coach_id and c.team_id=activity.team_id);
 insert into public.club_coach_calls(match_id,coach_id) select target,c.user_id from public.club_coach_teams c where c.team_id=activity.team_id on conflict do nothing;
 delete from public.club_match_calls where match_id=target and not(player_id=any(selected));
 insert into public.club_match_calls(match_id,player_id) select target,x from (select distinct unnest(selected) x)s on conflict do nothing;
 update public.matches set calls_sent_at=now() where id=target;
 select name into team_label from public.teams where id=activity.team_id;
 for recipient in
 with contacts as (
 select p.id,p.name,lower(trim(p.mother_email)) email from public.players p where p.id=any(selected)
 union select p.id,p.name,lower(trim(p.father_email)) from public.players p where p.id=any(selected)
 union select p.id,p.name,lower(trim(a.email)) from public.players p join public.club_player_access l on l.player_id=p.id join public.profiles a on a.id=l.user_id where p.id=any(selected)
 union select a.id,coalesce(nullif(a.full_name,''),'Tränare'),lower(trim(a.email)) from public.profiles a join public.club_coach_teams c on c.user_id=a.id where c.team_id=activity.team_id)
 select email,string_agg(distinct name,', ' order by name) names from contacts where email is not null and email<>'' group by email
 loop
 recipients:=array_append(recipients,recipient.email);
 select message_id into message from public.club_match_notices where match_id=target and recipient_email=recipient.email;
 if message is null then
 insert into public.messages(recipient_email,subject,content,sender_email,status,team_name) values(recipient.email,'Kallelse till match – '||team_label,
 'Hej! '||recipient.names||' är kallad till match mot '||activity.opponent||' med '||team_label||'. Datum: '||activity.date::text||' kl '||coalesce(to_char(activity.time,'HH24:MI'),'Tid ej angiven')||'. Plats: '||coalesce(activity.location,'')||'. '||coalesce(nullif(trim(note),''),'')||' Öppna Kallelser i portalen och svara Kommer eller Kommer inte.',auth.jwt()->>'email','sent',team_label) returning id into message;
 insert into public.club_match_notices values(target,recipient.email,message);
 else
 update public.messages set subject='Kallelse till match – '||team_label,content='Hej! '||recipient.names||' är kallad till match mot '||activity.opponent||' med '||team_label||'. Datum: '||activity.date::text||' kl '||coalesce(to_char(activity.time,'HH24:MI'),'Tid ej angiven')||'. Plats: '||coalesce(activity.location,'')||'. '||coalesce(nullif(trim(note),''),'')||' Öppna Kallelser i portalen och svara Kommer eller Kommer inte.',sender_email=auth.jwt()->>'email',team_name=team_label where id=message;
 end if;sent:=sent+1;
 end loop;
 delete from public.messages where id in(select message_id from public.club_match_notices where match_id=target and not(recipient_email=any(recipients)));
 return jsonb_build_object('players',(select count(*) from public.club_match_calls where match_id=target),'recipients',sent,'coaches',(select count(*) from public.club_coach_calls where match_id=target));
end;$$;
revoke all on function public.club_send_match_call(uuid,uuid[],text) from public,anon;
grant execute on function public.club_send_match_call(uuid,uuid[],text) to authenticated;



create function public.club_reply_coach_call(kind text,target uuid,answer boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or answer is null or kind not in ('training','match') then raise exception 'Välj ett giltigt svar.';end if;
 update public.club_coach_calls c set attending=answer,updated_at=now()
 where c.event_kind=kind and c.event_id=target and c.coach_id=auth.uid()
 and exists(select 1 from public.club_coach_teams l where l.user_id=auth.uid() and l.team_id=coalesce((select t.team_id from public.trainings t where t.id=c.training_id),(select m.team_id from public.matches m where m.id=c.match_id)));
 if not found then raise exception 'Du är inte kallad som tränare till den här aktiviteten.';end if;
end $$;
revoke all on function public.club_reply_coach_call(text,uuid,boolean) from public,anon;
grant execute on function public.club_reply_coach_call(text,uuid,boolean) to authenticated;
create function public.club_coach_invitations() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('key','coach:'||c.event_kind||':'||c.event_id,'kind',c.event_kind,'event',coalesce(to_jsonb(t),to_jsonb(m)),'player',jsonb_build_object('id',c.coach_id,'name',coalesce(nullif(p.full_name,''),'Tränare')),'answer',c.attending,'staff',true) order by coalesce(t.date,m.date),coalesce(t.time,m.time)),'[]'::jsonb)
 from public.club_coach_calls c join public.profiles p on p.id=c.coach_id
 left join public.trainings t on t.id=c.training_id left join public.matches m on m.id=c.match_id
 where c.coach_id=auth.uid() and exists(select 1 from public.club_coach_teams l where l.user_id=auth.uid() and l.team_id=coalesce(t.team_id,m.team_id))
$$;
revoke all on function public.club_coach_invitations() from public,anon;
grant execute on function public.club_coach_invitations() to authenticated;
create function public.club_event_coach_responses(kind text,target uuid) returns table(coach_id uuid,name text,attending boolean) language plpgsql stable security definer set search_path='' as $$
declare team uuid;
begin
 if kind='training' then select t.team_id into team from public.trainings t where t.id=target;
 elsif kind='match' then select m.team_id into team from public.matches m where m.id=target;end if;
 if auth.uid() is null or team is null or not public.club_staff_team(team) then raise exception 'Aktiviteten tillhör inte ditt lag.';end if;
 return query select c.coach_id,coalesce(nullif(p.full_name,''),'Tränare'),c.attending from public.club_coach_calls c join public.profiles p on p.id=c.coach_id join public.club_coach_teams l on l.user_id=c.coach_id and l.team_id=team where c.event_kind=kind and c.event_id=target order by p.full_name;
end $$;
revoke all on function public.club_event_coach_responses(text,uuid) from public,anon;
grant execute on function public.club_event_coach_responses(text,uuid) to authenticated;
notify pgrst,'reload schema';
