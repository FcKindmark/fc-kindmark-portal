do $migration$
declare definition text;
begin
 select pg_get_functiondef('public.club_admin_save_player_details(uuid,jsonb)'::regprocedure) into definition;
 if position('birth_date=case when details' in definition)=0 then
 definition:=replace(definition,' jersey:=nullif', E' if details ? ''birth_date'' and nullif(details->>''birth_date'','''') is not null then\n  if (details->>''birth_date'')::date < date ''1900-01-01'' or (details->>''birth_date'')::date > current_date then raise exception ''Ange ett giltigt födelsedatum.''; end if;\n  birth:=extract(year from (details->>''birth_date'')::date)::integer;\n end if;\n jersey:=nullif');
 definition:=replace(definition,'name=trim(details->>''name''),birth_year=birth,','name=trim(details->>''name''),birth_year=birth,birth_date=case when details ? ''birth_date'' then nullif(details->>''birth_date'','''')::date else birth_date end,');
 end if;
 definition:=replace(definition,chr(92)||chr(92)||'.','[.]');
 definition:=replace(definition,chr(92)||chr(92)||'+?','[+]?');
 execute definition;
end $migration$;