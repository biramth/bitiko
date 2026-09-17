-- Same gap as 0028_harden_function_grants.sql, reintroduced by 0039: these
-- are trigger-only/internal-helper functions, never meant to be called
-- directly via RPC, but every function keeps Postgres's default PUBLIC
-- execute grant unless explicitly revoked — 0039 didn't revoke it.

revoke execute on function public.plan_max_custom_sections(text) from public, anon, authenticated;
revoke execute on function public.count_custom_sections(jsonb) from public, anon, authenticated;
revoke execute on function public.enforce_shop_section_limit() from public, anon, authenticated;
revoke execute on function public.enforce_page_section_limit() from public, anon, authenticated;
