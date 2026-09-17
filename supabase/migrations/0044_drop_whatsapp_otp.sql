-- The WhatsApp OTP verification of a merchant's shop WhatsApp number during
-- onboarding has been removed from the app (it relied on the Meta WhatsApp
-- Cloud API AUTHENTICATION-category template, which costs money per code).
-- Drop the rate-limited send/verify functions (since 0043) and the codes
-- table (since 0020) that backed it. The codes are useless without the
-- endpoint, so their data is safe to delete.

drop function if exists public.whatsapp_otp_request(uuid, text, text);
drop function if exists public.whatsapp_otp_verify(uuid, text, text);
drop table if exists public.whatsapp_verifications;