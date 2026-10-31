-- Activate the second Bobek Library exercise; preserve all existing state.
insert into public.club_exercise_state(exercise_id) values ('fck-ex-202')
on conflict (exercise_id) do nothing;
