-- WhatsApp OTP verification during onboarding (table already existed since
-- 0020, unused until now — the actual send/check logic lives in
-- api/verify-whatsapp.ts via the WhatsApp Cloud API). These two functions
-- mirror check_email_rate_limit()'s pattern: atomic check-and-record so a
-- rate-limit check and its effect can't be split by a concurrent request.

-- Issuing a code: caps at 5 codes per user per hour (a real merchant needs
-- one, maybe a retry or two) and 3 per phone per 15 minutes (catches someone
-- hammering a single number, e.g. testing whether it's a valid WhatsApp
-- account). Also opportunistically prunes rows older than a day.
create or replace function public.whatsapp_otp_request(p_user_id uuid, p_phone text, p_code_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_count integer;
  v_phone_count integer;
begin
  delete from public.whatsapp_verifications where created_at < now() - interval '1 day';

  select count(*) into v_user_count from public.whatsapp_verifications
    where user_id = p_user_id and created_at > now() - interval '1 hour';
  select count(*) into v_phone_count from public.whatsapp_verifications
    where phone = p_phone and created_at > now() - interval '15 minutes';

  if v_user_count >= 5 or v_phone_count >= 3 then
    return false;
  end if;

  insert into public.whatsapp_verifications (user_id, phone, code_hash, expires_at)
    values (p_user_id, p_phone, p_code_hash, now() + interval '10 minutes');
  return true;
end;
$$;

-- Checking a code: locks the most recent unverified, unexpired attempt for
-- this (user, phone) pair, caps at 5 guesses (locking the row for the
-- duration avoids a race where two concurrent guesses both read attempts=4
-- and both proceed), and marks it verified on a match.
create or replace function public.whatsapp_otp_verify(p_user_id uuid, p_phone text, p_code_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.whatsapp_verifications%rowtype;
begin
  select * into v_row from public.whatsapp_verifications
    where user_id = p_user_id and phone = p_phone and verified_at is null and expires_at > now()
    order by created_at desc
    limit 1
    for update;

  if not found or v_row.attempts >= 5 then
    return false;
  end if;

  update public.whatsapp_verifications set attempts = attempts + 1 where id = v_row.id;

  if v_row.code_hash = p_code_hash then
    update public.whatsapp_verifications set verified_at = now() where id = v_row.id;
    return true;
  end if;

  return false;
end;
$$;

revoke execute on function public.whatsapp_otp_request(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.whatsapp_otp_verify(uuid, text, text) from public, anon, authenticated;
