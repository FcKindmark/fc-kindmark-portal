alter table public.profiles add column avatar_path text;
alter table public.profiles add constraint profiles_avatar_owner check(avatar_path is null or (avatar_path like id::text||'/%' and length(avatar_path)<180));
grant update(avatar_path) on public.profiles to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('club-profile-photos','club-profile-photos',false,2097152,array['image/jpeg']);
create policy profile_photos_read on storage.objects for select to authenticated using(bucket_id='club-profile-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy profile_photos_add on storage.objects for insert to authenticated with check(bucket_id='club-profile-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy profile_photos_delete on storage.objects for delete to authenticated using(bucket_id='club-profile-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
notify pgrst,'reload schema';
