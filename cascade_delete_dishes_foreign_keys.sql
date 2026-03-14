begin;

do $$
declare
  fk record;
  local_columns text;
  referenced_columns text;
begin
  for fk in
    select
      c.oid as constraint_oid,
      ns.nspname as table_schema,
      tbl.relname as table_name,
      c.conname as constraint_name,
      ref_ns.nspname as referenced_schema,
      ref_tbl.relname as referenced_table
    from pg_constraint c
    join pg_class tbl on tbl.oid = c.conrelid
    join pg_namespace ns on ns.oid = tbl.relnamespace
    join pg_class ref_tbl on ref_tbl.oid = c.confrelid
    join pg_namespace ref_ns on ref_ns.oid = ref_tbl.relnamespace
    where c.contype = 'f'
      and ref_ns.nspname = 'public'
      and ref_tbl.relname = 'dishes'
  loop
    select string_agg(format('%I', a.attname), ', ' order by cols.ord)
      into local_columns
    from unnest((select conkey from pg_constraint where oid = fk.constraint_oid)) with ordinality as cols(attnum, ord)
    join pg_attribute a
      on a.attrelid = format('%I.%I', fk.table_schema, fk.table_name)::regclass
     and a.attnum = cols.attnum;

    select string_agg(format('%I', a.attname), ', ' order by cols.ord)
      into referenced_columns
    from unnest((select confkey from pg_constraint where oid = fk.constraint_oid)) with ordinality as cols(attnum, ord)
    join pg_attribute a
      on a.attrelid = 'public.dishes'::regclass
     and a.attnum = cols.attnum;

    execute format(
      'alter table %I.%I drop constraint if exists %I',
      fk.table_schema,
      fk.table_name,
      fk.constraint_name
    );

    execute format(
      'alter table %I.%I add constraint %I foreign key (%s) references %I.%I (%s) on delete cascade',
      fk.table_schema,
      fk.table_name,
      fk.constraint_name,
      local_columns,
      fk.referenced_schema,
      fk.referenced_table,
      referenced_columns
    );
  end loop;
end $$;

notify pgrst, 'reload schema';

commit;
