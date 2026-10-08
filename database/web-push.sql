-- Opt-in device subscriptions. No existing member is subscribed or notified by migration.
create table public.club_push_subscriptions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null unique check(length(endpoint)<2048), p256dh text not null, auth text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index club_push_user_idx on public.club_push_subscriptions(user_id);
alter table public.club_push_subscriptions enable row level security;
revoke all on public.club_push_subscriptions from public,anon,authenticated;
grant select,delete on public.club_push_subscriptions to authenticated;
grant all on public.club_push_subscriptions to service_role;
create policy push_own_select on public.club_push_subscriptions for select to authenticated using(user_id=(select auth.uid()));
create policy push_own_delete on public.club_push_subscriptions for delete to authenticated using(user_id=(select auth.uid()));

create table public.club_push_outbox (
 id uuid primary key default gen_random_uuid(), subscription_id uuid not null references public.club_push_subscriptions(id) on delete cascade,
 message_id uuid not null references public.messages(id) on delete cascade,
 attempts integer not null default 0, available_at timestamptz not null default now(), sent_at timestamptz,
 lease uuid, last_status integer, unique(subscription_id,message_id)
);
alter table public.club_push_outbox enable row level security;
revoke all on public.club_push_outbox from public,anon,authenticated;
grant all on public.club_push_outbox to service_role;
create index club_push_pending_idx on public.club_push_outbox(available_at) where sent_at is null and attempts<5;

-- Key material is in encrypted Vault, never in a public table or frontend bundle.
create function public.club_push_config() returns jsonb language sql security definer set search_path='' as $$
 select decrypted_secret::jsonb from vault.decrypted_secrets where name='kindmark_web_push' limit 1
$$;
revoke all on function public.club_push_config() from public,anon,authenticated;
grant execute on function public.club_push_config() to service_role;

create function public.club_enqueue_push() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and new.subject is not distinct from old.subject and new.content is not distinct from old.content then return new; end if;
 insert into public.club_push_outbox(subscription_id,message_id)
 select s.id,new.id from public.club_push_subscriptions s join auth.users u on u.id=s.user_id
 where lower(u.email)=lower(new.recipient_email)
 on conflict(subscription_id,message_id) do update set attempts=0,available_at=now(),sent_at=null,lease=null,last_status=null;
 return new;
end $$;
revoke all on function public.club_enqueue_push() from public,anon,authenticated;
create trigger club_message_push after insert or update of subject,content on public.messages for each row execute function public.club_enqueue_push();

create function public.club_claim_push() returns table(job_id uuid,lease_id uuid,subscription_id uuid,user_id uuid,endpoint text,p256dh text,auth text,title text,target_url text) language sql security definer set search_path='' as $$
 with pending as (
   select o.id from public.club_push_outbox o where o.sent_at is null and o.attempts<5 and o.available_at<=now()
   order by o.available_at limit 20 for update skip locked
 ), claimed as (
   update public.club_push_outbox o set attempts=o.attempts+1,available_at=now()+interval '5 minutes',lease=gen_random_uuid()
   from pending p where o.id=p.id returning o.*
 ) select c.id,c.lease,s.id,s.user_id,s.endpoint,s.p256dh,s.auth,left(m.subject,140),
   case when tn.training_id is not null then '/?family=calls&activity=training&event='||tn.training_id::text
        when mn.match_id is not null then '/?family=calls&activity=match&event='||mn.match_id::text
        else '/?family=messages&message='||m.id::text end
 from claimed c join public.club_push_subscriptions s on s.id=c.subscription_id join public.messages m on m.id=c.message_id
 left join public.club_training_notices tn on tn.message_id=m.id
 left join public.club_match_notices mn on mn.message_id=m.id
$$;
revoke all on function public.club_claim_push() from public,anon,authenticated;
grant execute on function public.club_claim_push() to service_role;

create function public.club_finish_push(job uuid,claim uuid,status integer) returns void language sql security definer set search_path='' as $$
 update public.club_push_outbox set sent_at=case when status between 200 and 299 then now() else null end,
 last_status=status,available_at=now()+interval '2 minutes',lease=null,
 attempts=case when status in (400,401,403,404,410) then 5 else attempts end
 where id=job and lease=claim
$$;
revoke all on function public.club_finish_push(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.club_finish_push(uuid,uuid,integer) to service_role;

create extension if not exists pg_cron;
create function public.club_wake_push() returns void language plpgsql security definer set search_path='' as $$
declare config jsonb;
begin
 if not exists(select 1 from public.club_push_outbox where sent_at is null and attempts<5 and available_at<=now()) then return; end if;
 config:=public.club_push_config();
 if config is null then return; end if;
 perform net.http_post(url:=config->>'workerUrl',headers:=jsonb_build_object('Content-Type','application/json','x-kindmark-push',config->>'dispatchToken'),body:='{"action":"dispatch"}'::jsonb,timeout_milliseconds:=10000);
end $$;
revoke all on function public.club_wake_push() from public,anon,authenticated;
select cron.schedule('kindmark-push-delivery','* * * * *','select public.club_wake_push()');
