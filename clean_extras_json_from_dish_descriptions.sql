begin;

do $$
declare
  column_record record;
begin
  for column_record in
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'dishes'
      and (
        column_name = 'description'
        or column_name like 'description\_%' escape '\'
      )
  loop
    execute format(
      'update public.dishes
          set %1$I = null
        where coalesce(ltrim(%1$I), '''') like ''__EXTRAS_JSON__%%''',
      column_record.column_name
    );
  end loop;
end $$;

notify pgrst, 'reload schema';

commit;
