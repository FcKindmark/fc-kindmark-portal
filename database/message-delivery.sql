alter table public.messages add column if not exists send_telegram boolean not null default true;
alter table public.messages add column if not exists send_email boolean not null default false;
create table public.club_message_batches(id uuid primary key, user_id uuid not null references auth.users(id), result jsonb not null, created_at timestamptz not null default now());
alter table public.club_message_batches enable row level security;
revoke all on public.club_message_batches from public,anon,authenticated;
create table public.club_email_outbox(message_id uuid primary key references public.messages(id) on delete cascade, attempts int not null default 0, available_at timestamptz not null default now(), sent_at timestamptz, lease uuid,last_status int);
alter table public.club_email_outbox enable row level security;
revoke all on public.club_email_outbox from public,anon,authenticated;
grant select on public.club_email_outbox to authenticated;
create policy email_status_admin on public.club_email_outbox for select to authenticated using(public.is_admin());
create index email_pending on public.club_email_outbox(available_at) where sent_at is null and attempts<8;
create function public.club_mail_config() returns jsonb language sql security definer set search_path='' as $$
 select decrypted_secret::jsonb from vault.decrypted_secrets where name='kindmark_mail' limit 1
$$;
create function public.club_mail_save_config(config jsonb) returns void language plpgsql security definer set search_path='' as $$
declare sid uuid;begin
 select id into sid from vault.secrets where name='kindmark_mail';
 if sid is null then perform vault.create_secret(config::text,'kindmark_mail');else perform vault.update_secret(sid,config::text);end if;
end $$;
create or replace function public.club_enqueue_telegram() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not new.send_telegram then return new;end if;
 if tg_op='UPDATE' and new.subject is not distinct from old.subject and new.content is not distinct from old.content then return new;end if;
 insert into public.club_telegram_outbox(user_id,message_id)
 select l.user_id,new.id from public.club_telegram_links l join auth.users u on u.id=l.user_id where lower(u.email)=lower(new.recipient_email)
 on conflict(user_id,message_id) do update set attempts=0,available_at=now(),sent_at=null,lease=null,last_status=null;
 return new;
end $$;
-- This roster is server-side, normalized and deduplicated by recipient address.
create function public.club_broadcast_recipients(target uuid default null) returns table(email text) language sql stable security definer set search_path='' as $$
 select distinct lower(trim(e)) from (
 select p.mother_email as e from public.players p where target is null or p.team_id=target
 union all select p.father_email from public.players p where target is null or p.team_id=target
 union all select u.email from public.club_player_access a join public.players p on p.id=a.player_id join auth.users u on u.id=a.user_id where target is null or p.team_id=target
 union all select u.email from public.club_coach_teams c join auth.users u on u.id=c.user_id where target is null or c.team_id=target
 union all select u.email from public.club_member_cards c join auth.users u on u.id=c.user_id left join public.players p on p.id=c.player_id where c.status='active' and (target is null or p.team_id=target)
 union all select p.email from public.profiles p where target is null
 ) recipients where public.is_admin() and e is not null and trim(e) ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
$$;
create function public.club_broadcast_preview(target uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;begin
 if not public.is_admin() then raise exception 'Endast administratör.';end if;
 select jsonb_build_object('recipients',count(*),'telegram',count(*) filter(where exists(select 1 from public.club_telegram_links l join auth.users u on u.id=l.user_id where lower(u.email)=r.email)),'email_ready',coalesce((public.club_mail_config()->>'ready')::boolean,false)) into result from public.club_broadcast_recipients(target) r;
 return result;
end $$;
create function public.club_send_broadcast(request_id uuid,target uuid,title text,body text,email_channel boolean,telegram_channel boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare r record;mid uuid;result jsonb;count_recipients int:=0;count_telegram int:=0;label text;begin
 if not public.is_admin() or auth.uid() is null then raise exception 'Endast administratör.';end if;
 if request_id is null then raise exception 'Utskicks-id saknas.';end if;
 perform pg_advisory_xact_lock(hashtextextended(request_id::text,0));
 select b.result into result from public.club_message_batches b where b.id=request_id and b.user_id=auth.uid();
 if found then return result;end if;
 if title is null or body is null or length(trim(title)) not between 1 and 140 or length(trim(body)) not between 1 and 2800 then raise exception 'Ange ämne (max 140 tecken) och meddelande (max 2800 tecken).';end if;
 if email_channel is null or telegram_channel is null then raise exception 'Välj utskickskanaler.';end if;
 if email_channel and not coalesce((public.club_mail_config()->>'ready')::boolean,false) then raise exception 'Aktivera e-postutskick först.';end if;
 if target is not null then select name into label from public.teams where id=target;if not found then raise exception 'Laget finns inte.';end if;else label:='Hela föreningen';end if;
 for r in select email from public.club_broadcast_recipients(target) loop
 insert into public.messages(recipient_email,subject,content,sender_email,team_name,send_telegram,send_email) values(r.email,trim(title),trim(body),auth.jwt()->>'email',label,telegram_channel,email_channel) returning id into mid;
 if email_channel then insert into public.club_email_outbox(message_id) values(mid);end if;
 count_recipients:=count_recipients+1;
 if exists(select 1 from public.club_telegram_outbox where message_id=mid) then count_telegram:=count_telegram+1;end if;
 end loop;
 if count_recipients=0 then raise exception 'Inga mottagare med e-postadress.';end if;
 result:=jsonb_build_object('recipients',count_recipients,'email',case when email_channel then count_recipients else 0 end,'telegram',count_telegram);
 insert into public.club_message_batches(id,user_id,result) values(request_id,auth.uid(),result);
 return result;
end $$;
create function public.club_claim_mail() returns table(job_id uuid,lease_id uuid,recipient text,subject text,content text) language plpgsql security definer set search_path='' as $$
declare r record;begin
 for r in with pending as(select o.message_id from public.club_email_outbox o where o.sent_at is null and o.attempts<8 and o.available_at<=now() order by o.available_at limit 3 for update skip locked)
 update public.club_email_outbox o set attempts=o.attempts+1,available_at=now()+interval '5 minutes',lease=gen_random_uuid() from pending p where o.message_id=p.message_id returning o.message_id,o.lease loop
 return query select r.message_id,r.lease,m.recipient_email,m.subject,m.content from public.messages m where m.id=r.message_id;
 end loop;
end $$;
create function public.club_finish_mail(job uuid,claim uuid,status int) returns void language sql security definer set search_path='' as $$
 update public.club_email_outbox set sent_at=case when status=200 then now() else null end,last_status=status,lease=null,available_at=now()+interval '5 minutes',attempts=case when status in(400,401,403) then 8 else attempts end where message_id=job and lease=claim
$$;
create function public.club_wake_mail() returns void language plpgsql security definer set search_path='' as $$
declare config jsonb;begin
 if not exists(select 1 from public.club_email_outbox where sent_at is null and attempts<8 and available_at<=now()) then return;end if;
 config:=public.club_mail_config();if not coalesce((config->>'ready')::boolean,false) then return;end if;
 perform net.http_post(url:='https://rujzfmrkqvjolkbrpiwp.supabase.co/functions/v1/club-mail',headers:=jsonb_build_object('Content-Type','application/json','x-kindmark-mail',config->>'dispatchSecret'),body:='{"action":"dispatch"}'::jsonb,timeout_milliseconds:=10000);
end $$;
revoke all on function public.club_broadcast_recipients(uuid),public.club_broadcast_preview(uuid),public.club_send_broadcast(uuid,uuid,text,text,boolean,boolean) from public,anon;
revoke all on function public.club_broadcast_recipients(uuid) from authenticated;
grant execute on function public.club_broadcast_preview(uuid),public.club_send_broadcast(uuid,uuid,text,text,boolean,boolean) to authenticated;
revoke all on function public.club_mail_config(),public.club_mail_save_config(jsonb),public.club_claim_mail(),public.club_finish_mail(uuid,uuid,int),public.club_wake_mail() from public,anon,authenticated;
grant execute on function public.club_mail_config(),public.club_mail_save_config(jsonb),public.club_claim_mail(),public.club_finish_mail(uuid,uuid,int) to service_role;
select cron.schedule('kindmark-mail-delivery','* * * * *','select public.club_wake_mail()');
notify pgrst,'reload schema';
