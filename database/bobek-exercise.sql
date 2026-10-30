-- Add Bobek without changing existing archive state or permissions.
insert into public.club_exercise_state(exercise_id) values ('fck-ex-201')
on conflict (exercise_id) do nothing;
