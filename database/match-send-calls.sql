alter table public.matches add column calls_sent_at timestamptz;
create table public.club_match_notices(match_id uuid not null references public.matches(id) on delete cascade,recipient_email text not null,message_id uuid not null references public.messages(id) on delete cascade,primary key(match_id,recipient_email));
alter table public.club_match_notices enable row level security;
revoke all on public.club_match_notices from public,anon,authenticated;
create or replace function public.club_send_match_call(target uuid,selected uuid[],note text default '') returns jsonb language plpgsql security definer set search_path='' as $$
declare activity public.matches;team_label text;recipient record;message uuid;recipients text[]:='{}';sent integer:=0;
begin
 select * into activity from public.matches where id=target for update;
 if auth.uid() is null or not found or not public.club_staff_team(activity.team_id) then raise exception 'Du kan bara kalla spelare till dina egna lags matcher.';end if;
 if selected is null or cardinality(selected)=0 then raise exception 'Välj minst en spelare.';end if;
 if length(coalesce(note,''))>1000 then raise exception 'Meddelandet får vara högst 1000 tecken.';end if;
 if exists(select 1 from unnest(selected) x where x is null or not exists(select 1 from public.players p where p.id=x and p.team_id=activity.team_id)) then raise exception 'Välj spelare från matchens lag.';end if;
 delete from public.club_match_calls where match_id=target and not(player_id=any(selected));
 insert into public.club_match_calls(match_id,player_id) select target,x from (select distinct unnest(selected) x)s on conflict do nothing;
 update public.matches set calls_sent_at=now() where id=target;
 select name into team_label from public.teams where id=activity.team_id;
 for recipient in
 with contacts as (
 select p.id,p.name,lower(trim(p.mother_email)) email from public.players p where p.id=any(selected)
 union select p.id,p.name,lower(trim(p.father_email)) from public.players p where p.id=any(selected)
 union select p.id,p.name,lower(trim(a.email)) from public.players p join public.club_player_access l on l.player_id=p.id join public.profiles a on a.id=l.user_id where p.id=any(selected))
 select email,string_agg(distinct name,', ' order by name) names from contacts where email is not null and email<>'' group by email
 loop
 recipients:=array_append(recipients,recipient.email);
 select message_id into message from public.club_match_notices where match_id=target and recipient_email=recipient.email;
 if message is null then
 insert into public.messages(recipient_email,subject,content,sender_email,status,team_name) values(recipient.email,'Kallelse till match – '||team_label,
 'Hej! '||recipient.names||' är kallad till match mot '||activity.opponent||' med '||team_label||'. Datum: '||activity.date::text||' kl '||coalesce(to_char(activity.time,'HH24:MI'),'Tid ej angiven')||'. Plats: '||coalesce(activity.location,'')||'. '||coalesce(nullif(trim(note),''),'')||' Öppna Matcher i portalen och svara Kommer eller Kommer inte.',auth.jwt()->>'email','sent',team_label) returning id into message;
 insert into public.club_match_notices values(target,recipient.email,message);
 else
 update public.messages set subject='Kallelse till match – '||team_label,content='Hej! '||recipient.names||' är kallad till match mot '||activity.opponent||' med '||team_label||'. Datum: '||activity.date::text||' kl '||coalesce(to_char(activity.time,'HH24:MI'),'Tid ej angiven')||'. Plats: '||coalesce(activity.location,'')||'. '||coalesce(nullif(trim(note),''),'')||' Öppna Matcher i portalen och svara Kommer eller Kommer inte.',sender_email=auth.jwt()->>'email',team_name=team_label where id=message;
 end if;sent:=sent+1;
 end loop;
 delete from public.messages where id in(select message_id from public.club_match_notices where match_id=target and not(recipient_email=any(recipients)));
 return jsonb_build_object('players',(select count(*) from public.club_match_calls where match_id=target),'recipients',sent);
end;$$;
revoke all on function public.club_send_match_call(uuid,uuid[],text) from public,anon;
grant execute on function public.club_send_match_call(uuid,uuid[],text) to authenticated;

notify pgrst,'reload schema';

revoke insert,delete on public.club_match_calls from authenticated;
