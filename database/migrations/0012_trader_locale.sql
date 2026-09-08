-- Persist the authenticated Trader's Phoenix OS display language.
-- Existing ownership and RLS policies remain unchanged.

alter table public.traders
  add column locale text not null default 'en'
  constraint traders_locale_check check (locale in ('en', 'fr', 'es'));
