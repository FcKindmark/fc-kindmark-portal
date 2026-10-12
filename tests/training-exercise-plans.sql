-- Transactional live-schema verification; no fixture or plan survives rollback.
begin;
do $$ declare u uuid;t uuid;t2 uuid;tr uuid;tr2 uuid;v integer;begin
 select id into u from auth.users where raw_app_meta_data->>'club_role'='admin' limit 1;
 if u is null then raise exception 'Existing admin required';end if;
 insert into public.teams(name)values('ROLLBACK plan verification')returning id into t;
 insert into public.teams(name)values('ROLLBACK unrelated team')returning id into t2;
 insert into public.trainings(date,time,end_time,location,team_id)values(current_date,'12:00','13:00','ROLLBACK test',t)returning id into tr;
 insert into public.trainings(date,time,end_time,location,team_id)values(current_date,'12:00','13:00','ROLLBACK test',t2)returning id into tr2;
 insert into public.club_coach_teams(user_id,team_id)values(u,t)on conflict do nothing;
 perform set_config('test.plan_training',tr::text,true);perform set_config('test.plan_other',tr2::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated','app_metadata',jsonb_build_object('club_role','admin'))::text,true);
end $$;
set local role authenticated;
do $$ declare tr uuid:=current_setting('test.plan_training')::uuid;v integer;begin
 v:=public.club_save_training_plan(tr,array['fck-ex-101','fck-ex-200'],'First draft',false,0);
 if v<>1 or exists(select 1 from public.club_training_plan_publications where training_id=tr)then raise exception 'Draft leaked into publication';end if;
 v:=public.club_save_training_plan(tr,array['fck-ex-101','fck-ex-200'],'Published',true,v);
 if not exists(select 1 from public.club_training_plan_publications where training_id=tr and notes='Published' and published_by=auth.uid())then raise exception 'Publication/stamp failed';end if;
 v:=public.club_save_training_plan(tr,array['fck-ex-200'],'Private changes',false,v);
 if (select notes from public.club_training_plan_publications where training_id=tr)<>'Published'then raise exception 'Draft changed coach snapshot';end if;
 begin perform public.club_save_training_plan(tr,array['fck-ex-101'],'Stale',true,1);raise exception 'Stale accepted';exception when serialization_failure then null;end;
 begin perform public.club_save_training_plan(tr,array['fck-ex-999'],'Invalid',true,v);raise exception 'Unknown accepted';exception when raise_exception then if sqlerrm='Unknown accepted'then raise;end if;end;
 begin update public.club_training_plan_drafts set notes='Bypass' where training_id=tr;raise exception 'REST bypass accepted';exception when insufficient_privilege then null;end;
 perform public.club_save_training_plan(current_setting('test.plan_other')::uuid,array['fck-ex-150'],'Other team',true,0);
end $$;
reset role;
select set_config('request.jwt.claims',jsonb_set(auth.jwt(),'{app_metadata,club_role}','"coach"')::text,true);
set local role authenticated;
do $$ begin
 if not exists(select 1 from public.club_training_plan_publications where training_id=current_setting('test.plan_training')::uuid and notes='Published')then raise exception 'Assigned coach cannot read';end if;
 if exists(select 1 from public.club_training_plan_publications where training_id=current_setting('test.plan_other')::uuid)then raise exception 'Unrelated coach access';end if;
 if exists(select 1 from public.club_training_plan_drafts)then raise exception 'Coach sees drafts';end if;
 begin perform public.club_save_training_plan(current_setting('test.plan_training')::uuid,array['fck-ex-101'],'Coach write',true,3);raise exception 'Coach wrote';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claims',jsonb_set(auth.jwt(),'{app_metadata,club_role}','"parent"')::text,true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.club_training_plan_publications)or exists(select 1 from public.club_training_plan_drafts)then raise exception 'Parent plan exposure';end if;
end $$;
reset role;
select set_config('request.jwt.claims',jsonb_set(auth.jwt(),'{app_metadata,club_role}','"admin"')::text,true);
set local role authenticated;
do $$ declare tr uuid:=current_setting('test.plan_training')::uuid;v integer;begin
 v:=public.club_unpublish_training_plan(tr,3);
 if exists(select 1 from public.club_training_plan_publications where training_id=tr)or not exists(select 1 from public.club_training_plan_drafts where training_id=tr and notes='Private changes')then raise exception 'Unpublish lost draft';end if;
 perform public.club_save_training_plan(tr,array['fck-ex-200'],'Restored publication',true,v);
 if not exists(select 1 from public.club_training_plan_publications where training_id=tr and exercise_ids=array['fck-ex-200'])then raise exception 'Republish failed';end if;
end $$;
reset role;
do $$ begin
 if has_table_privilege('anon','public.club_training_plan_publications','select')then raise exception 'Anon grant';end if;
 if has_function_privilege('anon','public.club_save_training_plan(uuid,text[],text,boolean,integer)','execute')then raise exception 'Anon RPC grant';end if;
end $$;
rollback;
select 'PASS: ordered draft/publication, conflict, REST guard, admin/assigned coach/unrelated coach/parent/anon, unpublish/republish; all test data rolled back' as result;
