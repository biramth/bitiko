-- Backs the unified "email first" login/signup flow (api/check-email.ts):
-- the merchant types an email once, and the UI decides whether to show a
-- password field (existing account) or a signup form (new account) instead
-- of forcing them to pick login/signup upfront and hit a dead end.
--
-- auth.users isn't in the schemas PostgREST exposes (see supabase/config.toml
-- `schemas`), so this can't be a plain `select` from the client — it has to
-- be a function. SECURITY DEFINER so it can read auth.users regardless of
-- caller. Execute is revoked from anon/authenticated/public: this is only
-- ever called from api/check-email.ts using the service_role key, which
-- bypasses grants entirely. If it were reachable from the browser it would
-- be a plain email-enumeration oracle; kept server-only, api/check-email.ts
-- is the single place responsible for that endpoint's own rate limiting.
create or replace function public.email_has_account(p_email text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1 from auth.users where lower(email) = lower(p_email)
  );
$$;

revoke execute on function public.email_has_account(text) from public, anon, authenticated;
