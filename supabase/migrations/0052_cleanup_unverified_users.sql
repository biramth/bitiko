-- A signup that never confirms its email used to leave a permanent row in
-- auth.users, so the same person typing their email again got pushed to the
-- login form (or an obfuscated second signUp that sends nothing) instead of
-- being able to just finish signing up — and those half-finished accounts
-- piled up forever. Two fixes: tell the "email first" flow the real state
-- (none / unconfirmed / confirmed), and delete unverified accounts after 24h.

create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- Same idea as email_has_account (0031) but returns the three states the
-- unified login/signup page needs. Still server-only: execute is revoked from
-- anon/authenticated/public and it is only ever called by api/onboarding.ts
-- with the service_role key, so the rate limiting of that endpoint stays the
-- single gate on this enumeration signal.
create or replace function public.email_account_status(p_email text)
returns text
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select coalesce(
    (
      select case when u.email_confirmed_at is null then 'unconfirmed' else 'confirmed' end
      from auth.users u
      where lower(u.email) = lower(p_email)
      order by u.created_at desc
      limit 1
    ),
    'none'
  );
$$;

revoke execute on function public.email_account_status(text) from public, anon, authenticated;

-- Deletes accounts that signed up but never confirmed their email within
-- p_max_age. An unverified user cannot sign in, so it owns no shop, no
-- storage object, and no platform/campaign row — the NOT EXISTS guards only
-- keep the single DELETE robust if that assumption is ever wrong (one bad row
-- would otherwise abort the whole batch). The cascade from profiles -> shops
-- removes any related public rows.
create or replace function public.cleanup_unverified_users(p_max_age interval default interval '24 hours')
returns integer
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_deleted integer;
begin
  with doomed as (
    select u.id
    from auth.users u
    where u.email_confirmed_at is null
      and u.created_at < now() - p_max_age
      and not exists (select 1 from public.platform_members pm where pm.user_id = u.id or pm.created_by = u.id)
      and not exists (select 1 from public.campaigns c where c.created_by = u.id)
  )
  delete from auth.users u
  using doomed d
  where u.id = d.id;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke execute on function public.cleanup_unverified_users(interval) from public, anon, authenticated;

-- Hourly (:15) — a 24h window needs no finer precision. Runs as postgres so it
-- can delete from auth.users.
select cron.schedule(
  'cleanup-unverified-users',
  '15 * * * *',
  $$select public.cleanup_unverified_users()$$
);
