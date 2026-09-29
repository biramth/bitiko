-- Notifications push web du commerçant et tableau de bord en temps réel.
--   * `push_subscriptions` : un abonnement Web Push par navigateur/appareil,
--     rattaché à un compte (propriétaire ou collaborateur). Le serveur
--     (service role) y lit les destinataires d'une alerte ; le navigateur ne
--     lit et ne supprime que les siens.
--   * `register_push_subscription()` : seule voie d'écriture. Un même
--     navigateur partagé entre deux comptes garde un seul endpoint : il suit
--     le dernier compte qui l'active.
--   * Publication Realtime : commandes, rendez-vous et réservations sont
--     diffusés au tableau de bord ; Realtime applique la RLS de lecture.
-- Idempotent, re-exécutable.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check (endpoint like 'https://%' and char_length(endpoint) <= 2048),
  p256dh text not null check (char_length(p256dh) between 1 and 256),
  auth text not null check (char_length(auth) between 1 and 64),
  user_agent text null check (user_agent is null or char_length(user_agent) <= 300),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions: own read" on public.push_subscriptions;
create policy "push_subscriptions: own read" on public.push_subscriptions
  for select using (user_id = auth.uid());

drop policy if exists "push_subscriptions: own delete" on public.push_subscriptions;
create policy "push_subscriptions: own delete" on public.push_subscriptions
  for delete using (user_id = auth.uid());

create or replace function public.register_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_endpoint is null or p_endpoint not like 'https://%' or char_length(p_endpoint) > 2048 then
    raise exception 'invalid_endpoint' using errcode = '22023';
  end if;
  if coalesce(char_length(p_p256dh), 0) not between 1 and 256 or coalesce(char_length(p_auth), 0) not between 1 and 64 then
    raise exception 'invalid_keys' using errcode = '22023';
  end if;

  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set user_id = excluded.user_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_agent = excluded.user_agent,
        last_seen_at = now();
end;
$$;

revoke all on function public.register_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.register_push_subscription(text, text, text, text) to authenticated;

do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    return;
  end if;
  foreach t in array array['orders', 'appointments', 'reservations'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
