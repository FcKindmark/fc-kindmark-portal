alter table public.trainings add column end_time time;
with imported as (
  select id,regexp_match(admin_comment,'Tid:\s*([0-2]?[0-9]:[0-5][0-9])\s*[–—-]\s*([0-2]?[0-9]:[0-5][0-9])','i') times from public.trainings
)
update public.trainings t set end_time=i.times[2]::time from imported i
where t.id=i.id and i.times is not null and i.times[2] ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$';
create function public.club_attendance_after_training() returns trigger
language plpgsql security invoker set search_path='' as $$
declare activity public.trainings; ending timestamptz;
begin
  select * into activity from public.trainings where id=new.training_id;
  if not found or activity.end_time is null or activity.time is null then
    raise exception 'Ange träningens starttid och sluttid innan närvaro registreras.';
  end if;
  ending := ((activity.date + case when activity.end_time <= activity.time then 1 else 0 end) + activity.end_time) at time zone 'Europe/Stockholm';
  if clock_timestamp() < ending then
    raise exception 'Närvaro kan registreras först efter träningens sluttid.';
  end if;
  return new;
end;$$;
revoke all on function public.club_attendance_after_training() from public,anon,authenticated;
create trigger attendance_after_training before insert or update on public.club_attendance
for each row execute function public.club_attendance_after_training();
notify pgrst,'reload schema';
