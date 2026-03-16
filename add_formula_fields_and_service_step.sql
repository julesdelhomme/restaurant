begin;

alter table if exists public.dishes
  add column if not exists is_formula boolean not null default false,
  add column if not exists formula_category_ids text[];

alter table if exists public.orders
  add column if not exists service_step text not null default 'entree';

update public.orders
set service_step = 'entree'
where service_step is null or btrim(service_step) = '';

notify pgrst, 'reload schema';

commit;
