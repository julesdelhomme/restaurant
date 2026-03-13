begin;

alter table if exists public.dishes
  add column if not exists name_el text,
  add column if not exists name_nl text,
  add column if not exists name_pl text,
  add column if not exists name_ro text,
  add column if not exists name_zh text,
  add column if not exists name_ko text,
  add column if not exists name_ru text,
  add column if not exists name_ar text,
  add column if not exists description_el text,
  add column if not exists description_nl text,
  add column if not exists description_pl text,
  add column if not exists description_ro text,
  add column if not exists description_zh text,
  add column if not exists description_ko text,
  add column if not exists description_ru text,
  add column if not exists description_ar text,
  add column if not exists suggestion_el text,
  add column if not exists suggestion_nl text,
  add column if not exists suggestion_pl text,
  add column if not exists suggestion_ro text,
  add column if not exists suggestion_zh text,
  add column if not exists suggestion_ko text,
  add column if not exists suggestion_ru text,
  add column if not exists suggestion_ar text,
  add column if not exists suggestion_message_el text,
  add column if not exists suggestion_message_nl text,
  add column if not exists suggestion_message_pl text,
  add column if not exists suggestion_message_ro text,
  add column if not exists suggestion_message_zh text,
  add column if not exists suggestion_message_ko text,
  add column if not exists suggestion_message_ru text,
  add column if not exists suggestion_message_ar text;

alter table if exists public.categories
  add column if not exists name_el text,
  add column if not exists name_nl text,
  add column if not exists name_pl text,
  add column if not exists name_ro text,
  add column if not exists name_zh text,
  add column if not exists name_ko text,
  add column if not exists name_ru text,
  add column if not exists name_ar text,
  add column if not exists description_el text,
  add column if not exists description_nl text,
  add column if not exists description_pl text,
  add column if not exists description_ro text,
  add column if not exists description_zh text,
  add column if not exists description_ko text,
  add column if not exists description_ru text,
  add column if not exists description_ar text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'dishes' and column_name = 'name_gr'
  ) then
    execute 'update public.dishes set name_el = coalesce(nullif(name_el, ''''), name_gr) where coalesce(name_gr, '''') <> '''';';
  end if;
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'dishes' and column_name = 'description_gr'
  ) then
    execute 'update public.dishes set description_el = coalesce(nullif(description_el, ''''), description_gr) where coalesce(description_gr, '''') <> '''';';
  end if;
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'dishes' and column_name = 'name_cn'
  ) then
    execute 'update public.dishes set name_zh = coalesce(nullif(name_zh, ''''), name_cn) where coalesce(name_cn, '''') <> '''';';
  end if;
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'dishes' and column_name = 'description_cn'
  ) then
    execute 'update public.dishes set description_zh = coalesce(nullif(description_zh, ''''), description_cn) where coalesce(description_cn, '''') <> '''';';
  end if;
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'dishes' and column_name = 'name_kr'
  ) then
    execute 'update public.dishes set name_ko = coalesce(nullif(name_ko, ''''), name_kr) where coalesce(name_kr, '''') <> '''';';
  end if;
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'dishes' and column_name = 'description_kr'
  ) then
    execute 'update public.dishes set description_ko = coalesce(nullif(description_ko, ''''), description_kr) where coalesce(description_kr, '''') <> '''';';
  end if;
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'dishes' and column_name = 'suggestion_gr'
  ) then
    execute 'update public.dishes set suggestion_el = coalesce(nullif(suggestion_el, ''''), suggestion_gr) where coalesce(suggestion_gr, '''') <> '''';';
  end if;
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'dishes' and column_name = 'suggestion_cn'
  ) then
    execute 'update public.dishes set suggestion_zh = coalesce(nullif(suggestion_zh, ''''), suggestion_cn) where coalesce(suggestion_cn, '''') <> '''';';
  end if;
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'dishes' and column_name = 'suggestion_kr'
  ) then
    execute 'update public.dishes set suggestion_ko = coalesce(nullif(suggestion_ko, ''''), suggestion_kr) where coalesce(suggestion_kr, '''') <> '''';';
  end if;
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'dishes' and column_name = 'suggestion_message_gr'
  ) then
    execute 'update public.dishes set suggestion_message_el = coalesce(nullif(suggestion_message_el, ''''), suggestion_message_gr) where coalesce(suggestion_message_gr, '''') <> '''';';
  end if;
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'dishes' and column_name = 'suggestion_message_cn'
  ) then
    execute 'update public.dishes set suggestion_message_zh = coalesce(nullif(suggestion_message_zh, ''''), suggestion_message_cn) where coalesce(suggestion_message_cn, '''') <> '''';';
  end if;
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'dishes' and column_name = 'suggestion_message_kr'
  ) then
    execute 'update public.dishes set suggestion_message_ko = coalesce(nullif(suggestion_message_ko, ''''), suggestion_message_kr) where coalesce(suggestion_message_kr, '''') <> '''';';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'categories' and column_name = 'name_gr'
  ) then
    execute 'update public.categories set name_el = coalesce(nullif(name_el, ''''), name_gr) where coalesce(name_gr, '''') <> '''';';
  end if;
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'categories' and column_name = 'description_gr'
  ) then
    execute 'update public.categories set description_el = coalesce(nullif(description_el, ''''), description_gr) where coalesce(description_gr, '''') <> '''';';
  end if;
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'categories' and column_name = 'name_cn'
  ) then
    execute 'update public.categories set name_zh = coalesce(nullif(name_zh, ''''), name_cn) where coalesce(name_cn, '''') <> '''';';
  end if;
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'categories' and column_name = 'description_cn'
  ) then
    execute 'update public.categories set description_zh = coalesce(nullif(description_zh, ''''), description_cn) where coalesce(description_cn, '''') <> '''';';
  end if;
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'categories' and column_name = 'name_kr'
  ) then
    execute 'update public.categories set name_ko = coalesce(nullif(name_ko, ''''), name_kr) where coalesce(name_kr, '''') <> '''';';
  end if;
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'categories' and column_name = 'description_kr'
  ) then
    execute 'update public.categories set description_ko = coalesce(nullif(description_ko, ''''), description_kr) where coalesce(description_kr, '''') <> '''';';
  end if;
end $$;

create or replace function public.enforce_waiter_call_throttle()
returns trigger
language plpgsql
as $$
declare
  v_row jsonb := to_jsonb(new);
  v_restaurant_id text := nullif(v_row ->> 'restaurant_id', '');
  v_type text := lower(coalesce(v_row ->> 'type', ''));
  v_status text := lower(coalesce(v_row ->> 'status', 'pending'));
  v_table_number text := nullif(regexp_replace(coalesce(v_row ->> 'table_number', ''), '\s+', '', 'g'), '');
  v_table_id text := nullif(v_row ->> 'table_id', '');
  v_last_created_at timestamptz;
  v_retry_after_seconds integer;
begin
  if tg_table_name = 'notifications' then
    if v_type <> 'client' then
      return new;
    end if;
  elsif tg_table_name = 'calls' then
    if v_type not in ('appel', 'client') then
      return new;
    end if;
  else
    return new;
  end if;

  if v_status <> 'pending' then
    return new;
  end if;

  if v_restaurant_id is null or (v_table_number is null and v_table_id is null) then
    return new;
  end if;

  execute format(
    'select max(coalesce(created_at, now()))
       from public.%I
      where coalesce(lower(type::text), '''') = any($1)
        and coalesce(lower(status::text), ''pending'') = ''pending''
        and coalesce(restaurant_id::text, '''') = $2
        and (
          ($3 <> '''' and regexp_replace(coalesce(table_number::text, ''''), ''\s+'', '''', ''g'') = $3)
          or ($4 <> '''' and coalesce(table_id::text, '''') = $4)
        )',
    tg_table_name
  )
  into v_last_created_at
  using
    case when tg_table_name = 'notifications' then array['client'] else array['appel', 'client'] end,
    v_restaurant_id,
    coalesce(v_table_number, ''),
    coalesce(v_table_id, '');

  if v_last_created_at is null or v_last_created_at <= now() - interval '1 minute' then
    return new;
  end if;

  v_retry_after_seconds := greatest(1, ceil(extract(epoch from ((v_last_created_at + interval '1 minute') - now())))::integer);

  raise exception using
    errcode = 'P0001',
    message = format('Waiter call throttled. Retry in %s seconds.', v_retry_after_seconds),
    detail = 'WAITER_CALL_THROTTLED';
end;
$$;

do $$
begin
  if to_regclass('public.notifications') is not null then
    execute 'drop trigger if exists trg_notifications_waiter_call_throttle on public.notifications';
    execute 'create trigger trg_notifications_waiter_call_throttle before insert on public.notifications for each row execute function public.enforce_waiter_call_throttle()';
  end if;

  if to_regclass('public.calls') is not null then
    execute 'drop trigger if exists trg_calls_waiter_call_throttle on public.calls';
    execute 'create trigger trg_calls_waiter_call_throttle before insert on public.calls for each row execute function public.enforce_waiter_call_throttle()';
  end if;
end $$;

notify pgrst, 'reload schema';

commit;
