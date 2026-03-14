begin;

alter table if exists public.orders
  add column if not exists tip_amount numeric(10,2) not null default 0;

update public.orders
set tip_amount = 0
where tip_amount is null;

notify pgrst, 'reload schema';

commit;
