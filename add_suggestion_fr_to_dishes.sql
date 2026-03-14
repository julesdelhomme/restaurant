begin;

alter table if exists public.dishes
  add column if not exists suggestion_fr text;

notify pgrst, 'reload schema';

commit;
