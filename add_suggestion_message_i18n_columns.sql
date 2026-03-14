begin;

alter table if exists public.dishes
  add column if not exists suggestion_message_fr text,
  add column if not exists suggestion_message_en text,
  add column if not exists suggestion_message_es text,
  add column if not exists suggestion_message_de text,
  add column if not exists suggestion_message_it text,
  add column if not exists suggestion_message_pt text,
  add column if not exists suggestion_message_ja text,
  add column if not exists suggestion_message_jp text,
  add column if not exists suggestion_message_nl text,
  add column if not exists suggestion_message_pl text,
  add column if not exists suggestion_message_ro text,
  add column if not exists suggestion_message_el text,
  add column if not exists suggestion_message_zh text,
  add column if not exists suggestion_message_ko text,
  add column if not exists suggestion_message_ru text,
  add column if not exists suggestion_message_ar text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'dishes' and column_name = 'suggestion_message'
  ) then
    execute 'update public.dishes set suggestion_message_fr = coalesce(nullif(suggestion_message_fr, ''''), suggestion_message) where coalesce(suggestion_message, '''') <> '''';';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'dishes' and column_name = 'suggestion_message_jp'
  ) then
    execute 'update public.dishes set suggestion_message_ja = coalesce(nullif(suggestion_message_ja, ''''), suggestion_message_jp) where coalesce(suggestion_message_jp, '''') <> '''';';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'dishes' and column_name = 'suggestion_message_ja'
  ) then
    execute 'update public.dishes set suggestion_message_jp = coalesce(nullif(suggestion_message_jp, ''''), suggestion_message_ja) where coalesce(suggestion_message_ja, '''') <> '''';';
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
end $$;

notify pgrst, 'reload schema';

commit;
