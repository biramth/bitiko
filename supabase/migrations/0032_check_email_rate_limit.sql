-- api/check-email.ts's rate limiting was an in-memory Map — reset on every
-- cold start and keyed on IP alone, so it's trivially bypassed (rotate IP,
-- or just stay under the per-IP cap while scanning a big email list).
-- Replaces it with a persistent, atomic check-and-record in Postgres,
-- capped both per email (a real user checks the same email once or twice,
-- ever) and per IP (catches bulk scanning from one source).

create table public.check_email_attempts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  ip text not null,
  created_at timestamptz not null default now()
);

create index check_email_attempts_email_idx on public.check_email_attempts (lower(email), created_at desc);
create index check_email_attempts_ip_idx on public.check_email_attempts (ip, created_at desc);

-- RLS auto-enables on new tables (see rls_auto_enable() in 0006) and no
-- policy is added — only service_role (which bypasses RLS) ever touches
-- this table, from check_email_rate_limit() below.

-- Returns true if this (email, ip) pair is still under both caps, and
-- atomically records the attempt in the same call so a check and its
-- recording can't be split by a concurrent request. Also opportunistically
-- prunes attempts older than a day so the table doesn't grow unbounded.
create or replace function public.check_email_rate_limit(p_email text, p_ip text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email_count integer;
  v_ip_count integer;
begin
  delete from public.check_email_attempts where created_at < now() - interval '1 day';

  select count(*) into v_email_count from public.check_email_attempts
    where lower(email) = lower(p_email) and created_at > now() - interval '1 hour';
  select count(*) into v_ip_count from public.check_email_attempts
    where ip = p_ip and created_at > now() - interval '1 hour';

  if v_email_count >= 5 or v_ip_count >= 30 then
    return false;
  end if;

  insert into public.check_email_attempts (email, ip) values (p_email, p_ip);
  return true;
end;
$$;

revoke execute on function public.check_email_rate_limit(text, text) from public, anon, authenticated;
