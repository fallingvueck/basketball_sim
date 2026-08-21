-- BasketballLife V8.0 public-career upload hotfix
-- Run this entire file once in Supabase SQL Editor.

do $$
declare
  v_trigger record;
begin
  for v_trigger in
    select n.nspname as schema_name,c.relname as table_name,t.tgname as trigger_name
    from pg_trigger t
    join pg_class c on c.oid=t.tgrelid
    join pg_namespace n on n.oid=c.relnamespace
    join pg_proc p on p.oid=t.tgfoid
    where not t.tgisinternal
      and n.nspname='public'
      and c.relname='career_records'
      and pg_get_functiondef(p.oid) ilike '%V7.50.8 publisher required%'
  loop
    execute format('drop trigger if exists %I on %I.%I',
      v_trigger.trigger_name,v_trigger.schema_name,v_trigger.table_name);
  end loop;
end;
$$;

-- Confirm that no obsolete V7.50.8 validator remains attached.
select t.tgname as remaining_legacy_trigger
from pg_trigger t
join pg_class c on c.oid=t.tgrelid
join pg_namespace n on n.oid=c.relnamespace
join pg_proc p on p.oid=t.tgfoid
where not t.tgisinternal
  and n.nspname='public'
  and c.relname='career_records'
  and pg_get_functiondef(p.oid) ilike '%V7.50.8 publisher required%';
