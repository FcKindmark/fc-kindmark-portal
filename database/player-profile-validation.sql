-- Preserve admin-only player photos and accept valid contact details.
alter policy player_photos_add on storage.objects with check (
 bucket_id='club-profile-photos' and public.is_admin()
 and (storage.foldername(name))[1]='players'
 and exists(select 1 from public.players p
 where p.id::text=(storage.foldername(objects.name))[2])
);
do $migration$ declare definition text; begin
 select pg_get_functiondef('public.club_admin_save_player_details(uuid,jsonb)'::regprocedure) into definition;
 definition:=replace(definition,chr(92)||chr(92)||'.','[.]');
 definition:=replace(definition,chr(92)||chr(92)||'+?','[+]?');
 execute definition;
end $migration$;
