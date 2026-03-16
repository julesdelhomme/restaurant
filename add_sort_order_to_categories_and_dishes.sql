begin;

alter table if exists public.categories
  add column if not exists sort_order integer not null default 0;

update public.categories
set sort_order = 0
where sort_order is null;

alter table if exists public.dishes
  add column if not exists sort_order integer not null default 0;

update public.dishes
set sort_order = 0
where sort_order is null;

notify pgrst, 'reload schema';

commit;
