begin;

alter table if exists public.dish_options
  add column if not exists names_i18n jsonb not null default '{}'::jsonb;

create index if not exists idx_dish_options_dish_id
  on public.dish_options (dish_id);

do $$
declare
  has_dish_options boolean := to_regclass('public.dish_options') is not null;
  has_dishes boolean := to_regclass('public.dishes') is not null;
  has_dish_id boolean;
  has_name boolean;
  has_name_fr boolean;
  has_name_en boolean;
  has_name_es boolean;
  has_name_de boolean;
  existing_fk text;
  update_expr text := 'coalesce(names_i18n, ''{}''::jsonb)';
begin
  if not has_dish_options then
    return;
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'dish_options' and column_name = 'dish_id'
  ) into has_dish_id;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'dish_options' and column_name = 'name'
  ) into has_name;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'dish_options' and column_name = 'name_fr'
  ) into has_name_fr;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'dish_options' and column_name = 'name_en'
  ) into has_name_en;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'dish_options' and column_name = 'name_es'
  ) into has_name_es;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'dish_options' and column_name = 'name_de'
  ) into has_name_de;

  if has_name then
    update_expr := update_expr ||
      ' || case when coalesce(trim(name::text), '''') <> '''' then jsonb_build_object(''fr'', trim(name::text)) else ''{}''::jsonb end';
  end if;
  if has_name_fr then
    update_expr := update_expr ||
      ' || case when coalesce(trim(name_fr::text), '''') <> '''' then jsonb_build_object(''fr'', trim(name_fr::text)) else ''{}''::jsonb end';
  end if;
  if has_name_en then
    update_expr := update_expr ||
      ' || case when coalesce(trim(name_en::text), '''') <> '''' then jsonb_build_object(''en'', trim(name_en::text)) else ''{}''::jsonb end';
  end if;
  if has_name_es then
    update_expr := update_expr ||
      ' || case when coalesce(trim(name_es::text), '''') <> '''' then jsonb_build_object(''es'', trim(name_es::text)) else ''{}''::jsonb end';
  end if;
  if has_name_de then
    update_expr := update_expr ||
      ' || case when coalesce(trim(name_de::text), '''') <> '''' then jsonb_build_object(''de'', trim(name_de::text)) else ''{}''::jsonb end';
  end if;

  execute format('update public.dish_options set names_i18n = %s', update_expr);

  if not has_dish_id or not has_dishes then
    return;
  end if;

  select tc.constraint_name
    into existing_fk
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
   and tc.table_schema = kcu.table_schema
  join information_schema.constraint_column_usage ccu
    on tc.constraint_name = ccu.constraint_name
   and tc.table_schema = ccu.table_schema
  where tc.table_schema = 'public'
    and tc.table_name = 'dish_options'
    and tc.constraint_type = 'FOREIGN KEY'
    and kcu.column_name = 'dish_id'
    and ccu.table_schema = 'public'
    and ccu.table_name = 'dishes'
  limit 1;

  if existing_fk is not null then
    execute format('alter table public.dish_options drop constraint %I', existing_fk);
  end if;

  execute '
    alter table public.dish_options
    add constraint dish_options_dish_id_fkey
    foreign key (dish_id)
    references public.dishes(id)
    on delete cascade
  ';
end $$;

notify pgrst, 'reload schema';

commit;
