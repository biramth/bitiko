-- Same gap as 0028_harden_function_grants.sql / 0040_harden_section_limit_grants.sql:
-- prune_shop_publish_history is a trigger-only internal helper, never meant
-- to be called directly via RPC, but 0054 didn't revoke Postgres's default
-- PUBLIC execute grant.

revoke execute on function public.prune_shop_publish_history() from public, anon, authenticated;
