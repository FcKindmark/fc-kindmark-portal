begin;
do $$declare uid uuid;tid uuid:=gen_random_uuid();rid uuid:=gen_random_uuid();result jsonb;result2 jsonb;begin
 select id into uid from auth.users order by created_at limit 1;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'email','verification@fckindmark.se','app_metadata',jsonb_build_object('club_role','admin'))::text,true);
 insert into public.teams(id,name) values(tid,'Message verification');
 insert into public.players(name,team_id,mother_email,father_email) values('First fixture',tid,' Fixture@Example.com ','fixture@example.com'),('Second fixture',tid,'fixture@example.com','second@example.com');
 if (public.club_broadcast_preview(tid)->>'recipients')::int<>2 then raise exception 'Recipient normalization/dedup failed';end if;
 perform public.club_mail_save_config('{"ready":true}'::jsonb);
 result:=public.club_send_broadcast(rid,tid,'Ändrad matchtid','Matchen börjar senare.',true,false);
 result2:=public.club_send_broadcast(rid,tid,'Ändrad matchtid','Matchen börjar senare.',true,false);
 if result<>result2 or (result->>'email')::int<>2 or (result->>'telegram')::int<>0 then raise exception 'Channel selection or idempotency failed';end if;
 if (select count(*) from public.messages where team_name='Message verification')<>2 then raise exception 'Duplicate broadcast';end if;
 if (select count(*) from public.club_email_outbox o join public.messages m on m.id=o.message_id where m.team_name='Message verification')<>2 then raise exception 'Email queue missing';end if;
 if exists(select 1 from public.club_telegram_outbox o join public.messages m on m.id=o.message_id where m.team_name='Message verification') then raise exception 'Disabled Telegram queued';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'app_metadata',jsonb_build_object('club_role','parent'))::text,true);
 begin perform public.club_send_broadcast(gen_random_uuid(),tid,'Unauthorized','Denied',false,true);raise exception 'Parent could broadcast';exception when raise_exception then if sqlerrm='Parent could broadcast' then raise;end if;end;
end $$;
rollback;
select 'PASS broadcast: normalized/deduplicated team recipients, email queue, disabled Telegram, request retry idempotency and non-admin denial; fixtures rolled back' as result;
