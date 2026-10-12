begin;
create table public.club_exercise_state (
  exercise_id text primary key check (exercise_id ~ '^fck-ex-[0-9]{3}$'),
  archived_at timestamptz,
  changed_by uuid references auth.users(id) on delete set null,
  version integer not null default 0 check(version>=0)
);
insert into public.club_exercise_state(exercise_id)
select 'fck-ex-' || lpad(n::text,3,'0') from generate_series(1,100) n;
alter table public.club_exercise_state enable row level security;
revoke all on public.club_exercise_state from public,anon,authenticated;
grant select on public.club_exercise_state to authenticated;
grant update(archived_at) on public.club_exercise_state to authenticated;
create policy exercise_admin_read on public.club_exercise_state for select to authenticated using ((select public.is_admin()));
create policy exercise_admin_update on public.club_exercise_state for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create function public.club_exercise_stamp() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if not public.is_admin() or auth.uid() is null then raise exception 'Adminbehörighet krävs' using errcode='42501'; end if;
  new.archived_at=case when new.archived_at is null then null else now() end;
  new.changed_by=auth.uid();
  new.version=old.version+1;
  return new;
end $$;
revoke all on function public.club_exercise_stamp() from public,anon,authenticated;
create trigger exercise_stamp before update on public.club_exercise_state for each row execute function public.club_exercise_stamp();
create function public.club_set_exercise_archived(p_id text,p_archived boolean,p_expected_version integer) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
  if not public.is_admin() or auth.uid() is null then raise exception 'Adminbehörighet krävs' using errcode='42501'; end if;
  if p_archived is null or p_expected_version is null then raise exception 'Status och version krävs'; end if;
  update public.club_exercise_state set archived_at=case when p_archived then now() else null end
  where exercise_id=p_id and version=p_expected_version
  returning jsonb_build_object('exercise_id',exercise_id,'archived_at',archived_at,'version',version) into result;
  if result is null then raise exception 'Övningen har ändrats eller saknas. Läs om biblioteket innan du försöker igen.' using errcode='40001'; end if;
  return result;
end $$;
revoke all on function public.club_set_exercise_archived(text,boolean,integer) from public,anon,authenticated;
grant execute on function public.club_set_exercise_archived(text,boolean,integer) to authenticated;
commit;
