-- Private Telegram opt-in; credentials are encrypted in Vault.
create table public.club_telegram_links (
 user_id uuid primary key references auth.users(id) on delete cascade,
 chat_id bigint not null unique check(chat_id>0), created_at timestamptz not null default now()
);
create table public.club_telegram_tokens (
 user_id uuid primary key references auth.users(id) on delete cascade,
 token_hash text not null unique, expires_at timestamptz not null
);
create table public.club_telegram_updates (id bigint primary key, created_at timestamptz not null default now());
create table public.club_telegram_outbox (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.club_telegram_links(user_id) on delete cascade,
 message_id uuid not null references public.messages(id) on delete cascade,
 attempts int not null default 0, available_at timestamptz not null default now(), sent_at timestamptz,
 lease uuid, last_status int, unique(user_id,message_id)
);
create index telegram_pending on public.club_telegram_outbox(available_at) where sent_at is null and attempts<8;
create table public.club_telegram_actions (
 id uuid primary key default gen_random_uuid(), job_id uuid not null references public.club_telegram_outbox(id) on delete cascade,
 kind text not null check(kind in('training','match')), event_id uuid not null,
 target_id uuid not null, staff boolean not null, unique(job_id,target_id,staff)
);
do $$declare t text;begin
 foreach t in array array['club_telegram_links','club_telegram_tokens','club_telegram_updates','club_telegram_outbox','club_telegram_actions'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;

create function public.club_telegram_config() returns jsonb language sql security definer set search_path='' as $$
 select decrypted_secret::jsonb from vault.decrypted_secrets where name='kindmark_telegram' limit 1
$$;
create function public.club_telegram_save_config(config jsonb) returns void language plpgsql security definer set search_path='' as $$
declare secret_id uuid;begin
 select id into secret_id from vault.secrets where name='kindmark_telegram';
 if secret_id is null then perform vault.create_secret(config::text,'kindmark_telegram');
 else perform vault.update_secret(secret_id,config::text,'kindmark_telegram');end if;
end $$;
-- Service-only helper; never uses Telegram usernames as proof of identity.
create function public.club_telegram_owns(uid uuid,player uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.club_player_access a where a.user_id=uid and a.player_id=player)
 or exists(select 1 from public.players p join auth.users u on u.id=uid where p.id=player and
 (lower(p.mother_email)=lower(u.email) or lower(p.father_email)=lower(u.email)))
$$;
create function public.club_telegram_status(uid uuid) returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_object('ready',coalesce((public.club_telegram_config()->>'ready')::boolean,false),
 'bot',public.club_telegram_config()->>'username','connected',exists(select 1 from public.club_telegram_links where user_id=uid))
$$;
create function public.club_telegram_issue(uid uuid,hash text) returns void language plpgsql security definer set search_path='' as $$
begin
 if length(hash)<>64 then raise exception 'Ogiltig länk.';end if;
 insert into public.club_telegram_tokens(user_id,token_hash,expires_at) values(uid,hash,now()+interval '10 minutes')
 on conflict(user_id) do update set token_hash=excluded.token_hash,expires_at=excluded.expires_at;
end $$;
create function public.club_telegram_disconnect(uid uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 delete from public.club_telegram_links where user_id=uid;
 delete from public.club_telegram_tokens where user_id=uid;
end $$;
create function public.club_enqueue_telegram() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and new.subject is not distinct from old.subject and new.content is not distinct from old.content then return new;end if;
 insert into public.club_telegram_outbox(user_id,message_id)
 select l.user_id,new.id from public.club_telegram_links l join auth.users u on u.id=l.user_id where lower(u.email)=lower(new.recipient_email)
 on conflict(user_id,message_id) do update set attempts=0,available_at=now(),sent_at=null,lease=null,last_status=null;
 return new;
end $$;
create trigger club_message_telegram after insert or update of subject,content on public.messages for each row execute function public.club_enqueue_telegram();

create or replace function public.club_telegram_payload(job uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare o record; kind text; eid uuid; activity jsonb; r record; rows jsonb:='[]'; aid uuid; start_at timestamptz; path text;
begin
 select q.*,l.chat_id,m.subject,m.content,u.email into o from public.club_telegram_outbox q
 join public.club_telegram_links l on l.user_id=q.user_id join public.messages m on m.id=q.message_id
 join auth.users u on u.id=q.user_id where q.id=job and lower(u.email)=lower(m.recipient_email);
 if not found then return null;end if;
 select 'training',training_id into kind,eid from public.club_training_notices where message_id=o.message_id;
 if eid is null then select 'match',match_id into kind,eid from public.club_match_notices where message_id=o.message_id;end if;
 path:='/?family=messages&message='||o.message_id;
 if eid is not null then
 path:='/?family=calls&activity='||kind||'&event='||eid;
 if kind='training' then select to_jsonb(t) into activity from public.trainings t where t.id=eid;
 else select to_jsonb(m) into activity from public.matches m where m.id=eid;end if;
 start_at:=((activity->>'date')::date+coalesce((activity->>'time')::time,'23:59'::time)) at time zone 'Europe/Stockholm';
 if start_at>now() then
 for r in
 select p.id,p.name,false as staff from public.players p where p.team_id=(activity->>'team_id')::uuid and public.club_telegram_owns(o.user_id,p.id) and
 ((kind='training' and exists(select 1 from public.club_training_calls c where c.training_id=eid and c.player_id=p.id)) or
 (kind='match' and exists(select 1 from public.club_match_calls c where c.match_id=eid and c.player_id=p.id)))
 union all
 select c.coach_id,coalesce(p.full_name,'Tränare'),true from public.club_coach_calls c join public.profiles p on p.id=c.coach_id
 where c.coach_id=o.user_id and c.event_kind=kind and c.event_id=eid and exists(select 1 from public.club_coach_teams ct where ct.user_id=c.coach_id and ct.team_id=(activity->>'team_id')::uuid)
 loop
 insert into public.club_telegram_actions(job_id,kind,event_id,target_id,staff) values(job,kind,eid,r.id,r.staff)
 on conflict(job_id,target_id,staff) do update set kind=excluded.kind returning id into aid;
 rows:=rows||jsonb_build_array(jsonb_build_array(
 jsonb_build_object('text','🟢 '||left(r.name,22)||' · Kommer','callback_data','r:'||aid||':y'),
 jsonb_build_object('text','🔴 Kommer inte','callback_data','r:'||aid||':n')));
 end loop;
 end if;
 end if;
 if eid is null then
 rows:=rows||jsonb_build_array(jsonb_build_array(jsonb_build_object('text','Öppna meddelandet','url','https://portal.fckindmark.se'||path)));
 else
 o.content:=replace(o.content,' Öppna Kallelser i portalen och svara Kommer eller Kommer inte.','');
 o.content:=o.content||case when jsonb_array_length(rows)>0 then E'\n\nSvara direkt med knapparna nedan. Ditt svar sparas automatiskt.' else E'\n\nSvarstiden har gått ut.' end;
 end if;
 return jsonb_build_object('chat_id',o.chat_id,'text',left(o.subject,140)||E'\n\n'||left(o.content,2800),'reply_markup',jsonb_build_object('inline_keyboard',rows));
end $$;
create function public.club_claim_telegram() returns table(job_id uuid,lease_id uuid,payload jsonb) language plpgsql security definer set search_path='' as $$
declare r record;begin
 for r in with pending as(select id from public.club_telegram_outbox where sent_at is null and attempts<8 and available_at<=now() order by available_at limit 5 for update skip locked)
 update public.club_telegram_outbox o set attempts=o.attempts+1,available_at=now()+interval '5 minutes',lease=gen_random_uuid() from pending p where o.id=p.id returning o.id,o.lease loop
 job_id:=r.id;lease_id:=r.lease;payload:=public.club_telegram_payload(r.id);return next;
 end loop;
end $$;
create function public.club_finish_telegram(job uuid,claim uuid,status int,retry_seconds int default 120) returns void language sql security definer set search_path='' as $$
 update public.club_telegram_outbox set sent_at=case when status=200 then now() else null end,last_status=status,lease=null,
 available_at=now()+make_interval(secs=>greatest(10,least(86400,retry_seconds))),attempts=case when status in(400,401,403,404,410) then 8 else attempts end where id=job and lease=claim
$$;

-- One transaction deduplicates webhook updates and validates current permissions before RSVP.
create function public.club_telegram_update(update_id bigint,chat bigint,command text,hash text,action uuid,answer boolean) returns text language plpgsql security definer set search_path='' as $$
declare uid uuid; a record; activity jsonb; player_name text; start_at timestamptz;
begin
 if chat<=0 then return null;end if;
 insert into public.club_telegram_updates(id) values(update_id) on conflict do nothing;
 if not found then return null;end if;
 if command='start' then
 select user_id into uid from public.club_telegram_tokens where token_hash=hash and expires_at>now() for update;
 if uid is null then return 'Länken har gått ut. Öppna Min profil i medlemsportalen och välj Koppla Telegram igen.';end if;
 if exists(select 1 from public.club_telegram_links where chat_id=chat and user_id<>uid) then return 'Detta Telegram-konto är redan kopplat. Koppla bort det i Min profil först.';end if;
 -- A reconnect cannot expose queued messages intended for an earlier Telegram device.
 perform public.club_telegram_disconnect(uid);
 insert into public.club_telegram_links(user_id,chat_id) values(uid,chat);
 return 'Välkommen till FC Kindmark! Telegram är nu kopplat. Du får nya kallelser och meddelanden här och kan svara Kommer eller Kommer inte. Koppla bort när du vill i Min profil.';
 end if;
 select user_id into uid from public.club_telegram_links where chat_id=chat;
 if uid is null then return 'Koppla ditt konto via Min profil i medlemsportalen.';end if;
 if command='stop' then perform public.club_telegram_disconnect(uid);return 'Telegram är bortkopplat. Du får inga fler meddelanden här.';end if;
 if command<>'reply' then return 'Du kan svara på kallelser med knapparna nedan. Skriv /stop för att koppla bort Telegram.';end if;
 select t.* into a from public.club_telegram_actions t join public.club_telegram_outbox o on o.id=t.job_id
 join public.messages m on m.id=o.message_id join auth.users u on u.id=uid
 where t.id=action and o.user_id=uid and lower(m.recipient_email)=lower(u.email);
 if not found or answer is null then return 'Kallelsen är inte längre tillgänglig.';end if;
 if a.kind='training' then select to_jsonb(t) into activity from public.trainings t where t.id=a.event_id;
 else select to_jsonb(m) into activity from public.matches m where m.id=a.event_id;end if;
 start_at:=((activity->>'date')::date+coalesce((activity->>'time')::time,'23:59'::time)) at time zone 'Europe/Stockholm';
 if activity is null or start_at<=now() then return 'Aktiviteten har börjat. Kontakta tränaren om du behöver ändra ditt svar.';end if;
 if a.staff then
 update public.club_coach_calls c set attending=answer,updated_at=now() where c.event_kind=a.kind and c.event_id=a.event_id and c.coach_id=uid and c.coach_id=a.target_id and
 exists(select 1 from public.club_coach_teams ct where ct.user_id=uid and ct.team_id=(activity->>'team_id')::uuid);
 if not found then return 'Du är inte längre kallad som tränare.';end if;
 select coalesce(full_name,'Tränare') into player_name from public.profiles where id=uid;
 else
 if not public.club_telegram_owns(uid,a.target_id) or not exists(select 1 from public.players p where p.id=a.target_id and p.team_id=(activity->>'team_id')::uuid) then return 'Du har inte behörighet att svara för denna spelare.';end if;
 if a.kind='training' then
 if not exists(select 1 from public.club_training_calls where training_id=a.event_id and player_id=a.target_id) then return 'Spelaren är inte längre kallad.';end if;
 insert into public.training_attendance(training_id,player_id,attended) values(a.event_id,a.target_id,answer) on conflict(training_id,player_id) do update set attended=excluded.attended;
 else
 if not exists(select 1 from public.club_match_calls where match_id=a.event_id and player_id=a.target_id) then return 'Spelaren är inte längre kallad.';end if;
 insert into public.club_match_replies(match_id,player_id,attending) values(a.event_id,a.target_id,answer) on conflict(match_id,player_id) do update set attending=excluded.attending;
 end if;
 select name into player_name from public.players where id=a.target_id;
 end if;
 return coalesce(player_name,'Ditt svar')||': '||case when answer then 'Kommer ✅' else 'Kommer inte ❌' end||'. Svaret är sparat i medlemsportalen.';
end $$;

create function public.club_wake_telegram() returns void language plpgsql security definer set search_path='' as $$
declare config jsonb;begin
 if not exists(select 1 from public.club_telegram_outbox where sent_at is null and attempts<8 and available_at<=now()) then return;end if;
 config:=public.club_telegram_config();if not coalesce((config->>'ready')::boolean,false) then return;end if;
 perform net.http_post(url:='https://rujzfmrkqvjolkbrpiwp.supabase.co/functions/v1/club-telegram',headers:=jsonb_build_object('Content-Type','application/json','x-kindmark-telegram',config->>'dispatchSecret'),body:='{"action":"dispatch"}'::jsonb,timeout_milliseconds:=10000);
 delete from public.club_telegram_tokens where expires_at<now();
 delete from public.club_telegram_updates where created_at<now()-interval '30 days';
end $$;
do $$declare p record;begin
 for p in select oid::regprocedure as name from pg_proc where pronamespace='public'::regnamespace and (proname like 'club_telegram_%' or proname in('club_claim_telegram','club_finish_telegram','club_enqueue_telegram','club_wake_telegram')) loop
 execute format('revoke all on function %s from public,anon,authenticated',p.name);
 if p.name::text not like 'club_enqueue_telegram%' and p.name::text not like 'club_wake_telegram%' then execute format('grant execute on function %s to service_role',p.name);end if;
 end loop;
end $$;
select cron.schedule('kindmark-telegram-delivery','* * * * *','select public.club_wake_telegram()');
