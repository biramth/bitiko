-- Supabase grants EXECUTE on new functions to anon/authenticated/service_role
-- via schema default privileges, so `revoke … from public` in 0033 was not
-- enough to keep the `anon` role out. Revoke it explicitly — platform RPCs
-- must only ever be callable by signed-in users (and the admin check inside
-- each function still refuses non-operators).
revoke all on function public.is_platform_admin() from anon;
revoke all on function public.get_platform_stats() from anon;
revoke all on function public.get_platform_shops() from anon;
revoke all on function public.get_platform_orders(integer) from anon;