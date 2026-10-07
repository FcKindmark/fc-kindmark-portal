-- Published fixture dates may precede confirmed kick-off times.
alter table public.matches alter column time drop not null;
