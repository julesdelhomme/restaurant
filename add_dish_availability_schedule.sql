begin;

alter table if exists public.dishes
  add column if not exists available_days text[],
  add column if not exists start_time time,
  add column if not exists end_time time;

notify pgrst, 'reload schema';

commit;
