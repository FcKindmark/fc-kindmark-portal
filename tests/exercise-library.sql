-- Run against the deployed schema. Every change is rolled back.
begin;
do $$ begin
  if (select count(*) from public.club_exercise_state)<>100 then raise exception 'Expected 100 exercise states'; end if;
  if has_table_privilege('anon','public.club_exercise_state','select') then raise exception 'Anonymous read grant'; end if;
  if has_table_privilege('authenticated','public.club_exercise_state','delete') then raise exception 'Physical deletion grant'; end if;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from auth.users where raw_app_meta_data->>'club_role'='admin' limit 1),'role','authenticated','app_metadata',jsonb_build_object('club_role','admin'))::text,true);
set local role authenticated;
do $$ declare v integer; result jsonb; begin
  if auth.uid() is null then raise exception 'Existing admin required for test'; end if;
  select version into v from public.club_exercise_state where exercise_id='fck-ex-100';
  result=public.club_set_exercise_archived('fck-ex-100',true,v);
  if result->>'archived_at' is null or (result->>'version')::integer<>v+1 then raise exception 'Archive failed'; end if;
  if not exists(select 1 from public.club_exercise_state where exercise_id='fck-ex-100' and changed_by=auth.uid()) then raise exception 'Actor not stamped'; end if;
  begin
    perform public.club_set_exercise_archived('fck-ex-100',false,v);
    raise exception 'Stale version was accepted';
  exception when serialization_failure then null; end;
  result=public.club_set_exercise_archived('fck-ex-100',false,v+1);
  if result->>'archived_at' is not null or (result->>'version')::integer<>v+2 then raise exception 'Restore failed'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"club_role":"coach"},"user_metadata":{"club_role":"admin"}}',true);
do $$ begin
  if (select count(*) from public.club_exercise_state)<>0 then raise exception 'Coach could read library state'; end if;
  begin
    perform public.club_set_exercise_archived('fck-ex-100',true,0);
    raise exception 'Coach archived an exercise';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"club_role":"parent"},"user_metadata":{"club_role":"admin"}}',true);
do $$ begin
  if (select count(*) from public.club_exercise_state)<>0 then raise exception 'Parent could read library state'; end if;
  begin
    perform public.club_set_exercise_archived('fck-ex-100',false,0);
    raise exception 'Parent restored an exercise';
  exception when insufficient_privilege then null; end;
end $$;
set local role anon;
do $$ begin
  begin
    perform public.club_set_exercise_archived('fck-ex-100',true,0);
    raise exception 'Anonymous RPC allowed';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
select 'PASS: archive/restore, actor/version, stale writes, coach/parent/anon denial; all changes rolled back' as verification;
