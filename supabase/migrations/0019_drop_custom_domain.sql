-- The custom-domain feature is removed: every shop lives on its free
-- "<slug>.bitiko.shop" subdomain. No shop has a custom_domain set, so the
-- column (and its unique partial index) can be dropped outright.
alter table public.shops drop column custom_domain;