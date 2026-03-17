begin;

alter table if exists public.dishes
  add column if not exists only_in_formula boolean not null default false;

update public.dishes
set only_in_formula = false
where only_in_formula is null;

notify pgrst, 'reload schema';

commit;
