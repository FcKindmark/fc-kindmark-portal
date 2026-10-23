-- Extend the currently installed entry RPC without replacing later corrections.
-- Existing admin authentication, grants, search_path, year locks and core remain.
do $migration$
declare definition text; before_definition text;
begin
 definition:=pg_get_functiondef('public.club_econ_entry(text,jsonb)'::regprocedure);
 if position('doc.is_proforma and doc.kind<>''purchase''' in definition)>0 then return; end if;
 before_definition:=definition;
 if position('or doc.is_proforma or doc.amount<=0' in definition)=0
    or position('if not incoming and bank.date<doc.document_date then' in definition)=0 then
   raise exception 'Unexpected entry RPC version; review the installed function before applying';
 end if;
 definition:=replace(definition,'or doc.is_proforma or doc.amount<=0','or (doc.is_proforma and doc.kind<>''purchase'') or doc.amount<=0');
 definition:=replace(definition,'if not incoming and bank.date<doc.document_date then','if not incoming and (doc.is_proforma or bank.date<doc.document_date) then');
 definition:=replace(definition,
   'oldid:=nullif(payload->>''id'','''')::uuid;',
   $guard$oldid:=nullif(payload->>'id','')::uuid;
 if action in ('save','post') and exists(
   select 1 from public.club_econ_documents d
   where d.id=nullif(payload->>'document_id','')::uuid and d.is_proforma
 ) then raise exception 'Proforma får endast kopplas som förskott via bankens fakturafördelning. Slutfaktura krävs för kostnadsbokföring.';end if;$guard$);
 if definition=before_definition or position('Proforma får endast kopplas' in definition)=0 then raise exception 'Proforma guard was not installed';end if;
 execute definition;
end $migration$;
notify pgrst,'reload schema';
