begin;
-- Additive and idempotent: never restore previously archived exercises.
insert into public.club_exercise_state(exercise_id)
select 'fck-ex-'||lpad(n::text,3,'0') from generate_series(101,200)n
on conflict(exercise_id) do nothing;
create table public.club_training_plan_drafts(
 training_id uuid primary key references public.trainings(id) on delete cascade,
 exercise_ids text[] not null default '{}',
 notes text not null default '',
 version integer not null default 0 check(version>=0)
);
create table public.club_training_plan_publications(
 training_id uuid primary key references public.trainings(id) on delete cascade,
 exercise_ids text[] not null,
 notes text not null default '',
 published_at timestamptz not null default now(),
 published_by uuid references auth.users(id) on delete set null
);
alter table public.club_training_plan_drafts enable row level security;
alter table public.club_training_plan_publications enable row level security;
revoke all on public.club_training_plan_drafts,public.club_training_plan_publications from public,anon,authenticated;
grant select,insert,update on public.club_training_plan_drafts,public.club_training_plan_publications to authenticated;
grant delete on public.club_training_plan_publications to authenticated;
create policy draft_admin on public.club_training_plan_drafts for all to authenticated
 using((select public.is_admin())) with check((select public.is_admin()));
create policy publication_admin_write on public.club_training_plan_publications for all to authenticated
 using((select public.is_admin())) with check((select public.is_admin()));
create policy publication_coach_read on public.club_training_plan_publications for select to authenticated
 using(coalesce(auth.jwt()->'app_metadata'->>'club_role'='coach',false) and
 exists(select 1 from public.trainings t where t.id=training_id and public.club_staff_team(t.team_id)));
-- Prevent bypass of versioning/validation by direct REST writes. Invoker RPC sets this
-- transaction-local flag only after checking the existing trusted admin claim.
create function public.club_training_plan_guard() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if not public.is_admin() or auth.uid() is null or current_setting('club.plan_rpc',true) is distinct from 'on'
 then raise exception 'Använd planens säkra sparfunktion' using errcode='42501'; end if;
 if tg_op='DELETE' then return old; end if;
 if tg_table_name='club_training_plan_publications' then
   new.published_at=now();new.published_by=auth.uid();
 end if;
 return new;
end $$;
revoke all on function public.club_training_plan_guard() from public,anon,authenticated;
create trigger draft_guard before insert or update on public.club_training_plan_drafts for each row execute function public.club_training_plan_guard();
create trigger publication_guard before insert or update or delete on public.club_training_plan_publications for each row execute function public.club_training_plan_guard();
create function public.club_save_training_plan(p_training uuid,p_exercises text[],p_notes text,p_publish boolean,p_expected_version integer)
returns integer language plpgsql security invoker set search_path='' as $$
declare result integer;
begin
 if not public.is_admin() or auth.uid() is null then raise exception 'Adminbehörighet krävs' using errcode='42501'; end if;
 if p_publish is null or p_expected_version is null or p_exercises is null or cardinality(p_exercises)>50 or length(coalesce(p_notes,''))>4000
 then raise exception 'Ogiltig plan; högst 50 övningar och 4000 tecken';end if;
 if (select count(distinct x) from unnest(p_exercises)x)<>cardinality(p_exercises) or
 exists(select 1 from unnest(p_exercises)x where x is null or not exists(select 1 from public.club_exercise_state s where s.exercise_id=x))
 then raise exception 'Okänd eller dubblerad övning';end if;
 if p_publish and cardinality(p_exercises)=0 then raise exception 'Välj minst en övning före publicering';end if;
 -- Lock the parent to serialize first-save and concurrent editors.
 perform 1 from public.trainings where id=p_training for update;
 if not found then raise exception 'Träningen saknas';end if;
 perform set_config('club.plan_rpc','on',true);
 insert into public.club_training_plan_drafts(training_id) values(p_training) on conflict do nothing;
 update public.club_training_plan_drafts set exercise_ids=p_exercises,notes=coalesce(p_notes,''),version=version+1
 where training_id=p_training and version=p_expected_version returning version into result;
 if result is null then raise exception 'Planen har ändrats. Läs om före nästa försök.' using errcode='40001';end if;
 if p_publish then
 insert into public.club_training_plan_publications(training_id,exercise_ids,notes)
 values(p_training,p_exercises,coalesce(p_notes,'')) on conflict(training_id)
 do update set exercise_ids=excluded.exercise_ids,notes=excluded.notes;
 end if;
 perform set_config('club.plan_rpc','off',true);
 return result;
end $$;
create function public.club_unpublish_training_plan(p_training uuid,p_expected_version integer)
returns integer language plpgsql security invoker set search_path='' as $$
declare result integer;
begin
 if not public.is_admin() or auth.uid() is null then raise exception 'Adminbehörighet krävs' using errcode='42501';end if;
 perform 1 from public.trainings where id=p_training for update;
 perform set_config('club.plan_rpc','on',true);
 update public.club_training_plan_drafts set version=version+1 where training_id=p_training and version=p_expected_version returning version into result;
 if result is null then raise exception 'Planen har ändrats. Läs om före nästa försök.' using errcode='40001';end if;
 delete from public.club_training_plan_publications where training_id=p_training;
 perform set_config('club.plan_rpc','off',true);
 return result;
end $$;
revoke all on function public.club_save_training_plan(uuid,text[],text,boolean,integer),public.club_unpublish_training_plan(uuid,integer) from public,anon,authenticated;
grant execute on function public.club_save_training_plan(uuid,text[],text,boolean,integer),public.club_unpublish_training_plan(uuid,integer) to authenticated;
commit;
