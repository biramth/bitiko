-- Covering indexes for the foreign keys introduced by 0048 (platform_members)
-- and 0049 (campaigns / campaign_sends), flagged by the performance advisor.
create index if not exists platform_members_created_by_idx on public.platform_members (created_by);
create index if not exists campaigns_created_by_idx on public.campaigns (created_by);
create index if not exists campaign_sends_shop_idx on public.campaign_sends (shop_id);
