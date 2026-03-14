begin;

alter table if exists public.restaurants
  add column if not exists otp_enabled boolean not null default false;

notify pgrst, 'reload schema';

commit;
