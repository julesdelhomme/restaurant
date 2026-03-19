begin;

do $$
declare
  formula_dish_type text;
  formula_id_type text;
begin
  select format_type(a.atttypid, a.atttypmod)
    into formula_dish_type
  from pg_attribute a
  where a.attrelid = 'public.formula_dish_links'::regclass
    and a.attname = 'formula_dish_id'
    and a.attnum > 0
    and not a.attisdropped;

  if formula_dish_type is null then
    raise exception 'public.formula_dish_links.formula_dish_id est introuvable';
  end if;

  select format_type(a.atttypid, a.atttypmod)
    into formula_id_type
  from pg_attribute a
  where a.attrelid = 'public.formula_dish_links'::regclass
    and a.attname = 'formula_id'
    and a.attnum > 0
    and not a.attisdropped;

  if formula_id_type is null then
    execute format(
      'alter table public.formula_dish_links add column formula_id %s',
      formula_dish_type
    );
  elsif formula_id_type <> formula_dish_type then
    execute format(
      'alter table public.formula_dish_links alter column formula_id type %s using formula_id::text::%s',
      formula_dish_type,
      formula_dish_type
    );
  end if;
end $$;

alter table public.formula_dish_links
  add column if not exists step integer;

alter table public.formula_dish_links
  add column if not exists is_main boolean;

update public.formula_dish_links
set formula_id = formula_dish_id
where formula_id is null
  and formula_dish_id is not null;

update public.formula_dish_links
set formula_dish_id = formula_id
where formula_dish_id is null
  and formula_id is not null;

update public.formula_dish_links
set step = sequence
where step is null
  and sequence is not null;

update public.formula_dish_links
set sequence = step
where sequence is null
  and step is not null;

update public.formula_dish_links
set step = 1
where step is null or step < 1;

update public.formula_dish_links
set sequence = 1
where sequence is null or sequence < 1;

update public.formula_dish_links
set is_main = (dish_id::text = coalesce(formula_id::text, formula_dish_id::text))
where is_main is null;

alter table public.formula_dish_links
  alter column formula_id set not null;

alter table public.formula_dish_links
  alter column step set default 1;

alter table public.formula_dish_links
  alter column step set not null;

alter table public.formula_dish_links
  alter column is_main set default false;

alter table public.formula_dish_links
  alter column is_main set not null;

create index if not exists idx_formula_dish_links_formula_id_alias
  on public.formula_dish_links (formula_id);

create index if not exists idx_formula_dish_links_step
  on public.formula_dish_links (step);

create unique index if not exists idx_formula_dish_links_formula_id_dish_unique
  on public.formula_dish_links (formula_id, dish_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'formula_dish_links_step_check'
      and conrelid = 'public.formula_dish_links'::regclass
  ) then
    alter table public.formula_dish_links
      add constraint formula_dish_links_step_check
      check (step >= 1);
  end if;
end $$;

create or replace function public.sync_formula_dish_links_columns()
returns trigger
language plpgsql
as $$
begin
  if new.formula_dish_id is null then
    new.formula_dish_id := new.formula_id;
  end if;
  if new.formula_id is null then
    new.formula_id := new.formula_dish_id;
  end if;

  if new.sequence is null then
    new.sequence := new.step;
  end if;
  if new.step is null then
    new.step := new.sequence;
  end if;

  if new.sequence is null or new.sequence < 1 then
    new.sequence := 1;
  end if;
  if new.step is null or new.step < 1 then
    new.step := 1;
  end if;

  if new.is_main is null then
    new.is_main := (new.dish_id::text = coalesce(new.formula_id::text, new.formula_dish_id::text));
  end if;

  return new;
end;
$$;

drop trigger if exists trg_formula_dish_links_sync_columns on public.formula_dish_links;

create trigger trg_formula_dish_links_sync_columns
before insert or update on public.formula_dish_links
for each row
execute function public.sync_formula_dish_links_columns();

notify pgrst, 'reload schema';

commit;
