begin;

alter table if exists public.categories
  add column if not exists destination text not null default 'cuisine';

update public.categories
set destination = 'cuisine'
where destination is null or btrim(destination) = '';

notify pgrst, 'reload schema';

commit;
