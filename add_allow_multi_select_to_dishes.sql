begin;

alter table if exists public.dishes
  add column if not exists allow_multi_select boolean not null default false;

notify pgrst, 'reload schema';

commit;
