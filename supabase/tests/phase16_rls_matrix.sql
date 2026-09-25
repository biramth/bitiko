-- supabase/tests/phase16_rls_matrix.sql — PHASE-16 Integration: tenant isolation.
--
-- Run: supabase db query --linked --project-ref tlqgcmbdethmhqrablcy -f supabase/tests/phase16_rls_matrix.sql
-- DEV ONLY (fixtures are created and removed inside; hardcodes two throwaway
-- dev user ids — never run against prod).
-- Technique: single DO block; SET ROLE + request.jwt.claims impersonation
-- (auth.uid() reads the claim); every assertion raises on failure, so any
-- output other than "MATRIX-OK" means a regression. RLS ALLOW and DENY paths.
--
-- Matrices: shops public read · products anon active-only · orders owner/team
-- read + status-only writes (WITH CHECK + scope trigger) · subscriptions
-- owner-only + no client writes · referentials public read · organizations
-- member-only · shop_members self/owner · order emitter + customer sync chain.

do $$
declare
  a uuid := '2ea2f35c-a51f-4636-9918-862dd574a4bd'; -- dev user A (owner)
  b uuid := '21e7a032-c1b1-4a5e-a3ef-b313389450fb'; -- dev user B (outsider, then vendeur)
  v_shop uuid; v_shop2 uuid; v_puba uuid; v_pubh uuid; v_order uuid; v_org uuid;
  v_n int; v_failed int := 0; v_msg text := '';
begin
  -- Fixtures (postgres bypasses RLS; all removed at the end).
  insert into public.shops (owner_id, name, slug, whatsapp_number)
    values (a, 'P16 Matrix', 'p16-matrix', '+221770000001') returning id into v_shop;
  insert into public.shops (owner_id, name, slug, whatsapp_number)
    values (a, 'P16 Matrix 2', 'p16-matrix-2', '+221770000002') returning id into v_shop2;
  insert into public.products (shop_id, name, slug, price, active)
    values (v_shop, 'Visible', 'visible', 1000, true) returning id into v_puba;
  insert into public.products (shop_id, name, slug, price, active)
    values (v_shop, 'Hidden', 'hidden', 1000, false) returning id into v_pubh;
  insert into public.orders (shop_id, order_number, customer_name, customer_phone, total)
    values (v_shop, 'P16-1', 'Client Test', '+221771111111', 5000) returning id into v_order;
  insert into public.order_items (order_id, product_name, unit_price, quantity, subtotal)
    values (v_order, 'Visible', 1000, 2, 2000);
  insert into public.shop_subscriptions (shop_id, plan, status)
    values (v_shop, 'free', 'active');
  insert into public.payment_transactions (provider_code, shop_id, plan, amount, client_reference, status)
    values ('wave', v_shop, 'free', 0, 'P16-PROBE', 'pending');
  insert into public.organizations (name) values ('P16 Orga') returning id into v_org;
  insert into public.organization_members (organization_id, user_id, role, accepted_at)
    values (v_org, a, 'owner', now());

  -- Emitter chain proof: order insert fired ORDER_CREATED + customer sync.
  select count(*) into v_n from public.business_events
    where shop_id = v_shop and type = 'ORDER_CREATED';
  if v_n <> 1 then v_failed := v_failed + 1; raise notice 'E-emitter: %', v_n; end if;
  select count(*) into v_n from public.customers where shop_id = v_shop and phone = '+221771111111';
  if v_n <> 1 then v_failed := v_failed + 1; raise notice 'E-sync: %', v_n; end if;

  -- T1 anon: public storefront surface only.
  set role anon;
  select count(*) into v_n from public.shops where id = v_shop;
  if v_n <> 1 then v_failed := v_failed + 1; v_msg := v_msg || 'T1a '; raise notice 'T1a'; end if;
  select count(*) into v_n from public.products where id = v_puba;
  if v_n <> 1 then v_failed := v_failed + 1; v_msg := v_msg || 'T1b '; raise notice 'T1b'; end if;
  select count(*) into v_n from public.products where id = v_pubh;
  if v_n <> 0 then v_failed := v_failed + 1; v_msg := v_msg || 'T1c '; raise notice 'T1c'; end if;
  select count(*) into v_n from public.orders where id = v_order;
  if v_n <> 0 then v_failed := v_failed + 1; v_msg := v_msg || 'T1d '; raise notice 'T1d'; end if;
  select count(*) into v_n from public.business_types;
  if v_n <> 4 then v_failed := v_failed + 1; v_msg := v_msg || 'T1e '; raise notice 'T1e'; end if;
  reset role;

  -- T2 outsider B: public rows yes, tenant rows no.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, false);
  set role authenticated;
  select count(*) into v_n from public.orders where shop_id = v_shop;
  if v_n <> 0 then v_failed := v_failed + 1; v_msg := v_msg || 'T2a '; raise notice 'T2a'; end if;
  select count(*) into v_n from public.shop_subscriptions where shop_id = v_shop;
  -- Public read by design (0014, documented P01 §3.3 — pending P15 decision), NOT a leak to fix here.
  if v_n <> 1 then v_failed := v_failed + 1; v_msg := v_msg || 'T2b '; raise notice 'T2b'; end if;
  select count(*) into v_n from public.organizations where id = v_org;
  if v_n <> 0 then v_failed := v_failed + 1; v_msg := v_msg || 'T2c '; raise notice 'T2c'; end if;
  select count(*) into v_n from public.orders where shop_id = v_shop2;
  if v_n <> 0 then v_failed := v_failed + 1; v_msg := v_msg || 'T2d '; raise notice 'T2d'; end if;
  begin
    insert into public.shop_subscriptions (shop_id, plan) values (v_shop, 'pro');
    v_failed := v_failed + 1; v_msg := v_msg || 'T2e NOT BLOCKED '; raise notice 'T2e NOT BLOCKED';
  exception when insufficient_privilege then null;
  end;
  -- Outsider matches no USING clause: RLS denies silently (0 rows, no error).
  -- Assert the denial by rowcount, not by exception.
  update public.shops set name = 'Hijacked' where id = v_shop;
  get diagnostics v_n = row_count;
  if v_n <> 0 then v_failed := v_failed + 1; v_msg := v_msg || 'T2f '; raise notice 'T2f'; end if;
  reset role;

  -- T3 owner A: full own-shop access, cross-shop none needed (single owner).
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, false);
  set role authenticated;
  select count(*) into v_n from public.orders where shop_id = v_shop;
  if v_n <> 1 then v_failed := v_failed + 1; v_msg := v_msg || 'T3a '; raise notice 'T3a'; end if;
  select count(*) into v_n from public.shop_subscriptions where shop_id = v_shop;
  if v_n <> 1 then v_failed := v_failed + 1; v_msg := v_msg || 'T3b '; raise notice 'T3b'; end if;
  select count(*) into v_n from public.organizations where id = v_org;
  if v_n <> 1 then v_failed := v_failed + 1; v_msg := v_msg || 'T3c '; raise notice 'T3c'; end if;
  select count(*) into v_n from public.payment_transactions where shop_id = v_shop;
  if v_n <> 1 then v_failed := v_failed + 1; v_msg := v_msg || 'T3d '; raise notice 'T3d'; end if;
  -- WITH CHECK: ownership transfer denied.
  begin
    update public.shops set owner_id = b where id = v_shop;
    v_failed := v_failed + 1; v_msg := v_msg || 'T3e NOT BLOCKED '; raise notice 'T3e NOT BLOCKED';
  exception when insufficient_privilege then null;
  end;
  reset role;

  -- B becomes vendeur member of shop 1.
  insert into public.shop_members (shop_id, email, user_id, role, accepted_at)
    values (v_shop, 'p16b@t.e', b, 'vendeur', now());

  -- T4 team member: reads yes, status yes, money/data no.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, false);
  set role authenticated;
  select count(*) into v_n from public.orders where id = v_order;
  if v_n <> 1 then v_failed := v_failed + 1; v_msg := v_msg || 'T4a '; raise notice 'T4a'; end if;
  select count(*) into v_n from public.order_items where order_id = v_order;
  if v_n <> 1 then v_failed := v_failed + 1; v_msg := v_msg || 'T4b '; raise notice 'T4b'; end if;
  select count(*) into v_n from public.orders where shop_id = v_shop2;
  if v_n <> 0 then v_failed := v_failed + 1; v_msg := v_msg || 'T4c '; raise notice 'T4c'; end if;
  update public.orders set status = 'confirmed' where id = v_order;
  select count(*) into v_n from public.orders where id = v_order and status = 'confirmed';
  if v_n <> 1 then v_failed := v_failed + 1; v_msg := v_msg || 'T4d '; raise notice 'T4d'; end if;
  begin
    update public.orders set total = 1 where id = v_order;
    v_failed := v_failed + 1; v_msg := v_msg || 'T4e NOT BLOCKED '; raise notice 'T4e NOT BLOCKED';
  exception when insufficient_privilege then null;
  end;
  update public.shops set name = 'Hijacked' where id = v_shop;
  get diagnostics v_n = row_count;
  if v_n <> 0 then v_failed := v_failed + 1; v_msg := v_msg || 'T4f '; raise notice 'T4f'; end if;
  select count(*) into v_n from public.shop_members where user_id = b;
  if v_n <> 1 then v_failed := v_failed + 1; v_msg := v_msg || 'T4g '; raise notice 'T4g'; end if;
  reset role;

  -- Cleanup (postgres).
  delete from public.automation_runs where event_id in (select id from public.business_events where shop_id in (v_shop, v_shop2));
  delete from public.business_events where shop_id in (v_shop, v_shop2);
  delete from public.order_items where order_id = v_order;
  delete from public.orders where id = v_order;
  delete from public.products where id in (v_puba, v_pubh);
  delete from public.customers where shop_id = v_shop;
  delete from public.shop_members where shop_id = v_shop;
  delete from public.shop_subscriptions where shop_id = v_shop;
  delete from public.payment_transactions where shop_id = v_shop;
  delete from public.organization_members where organization_id = v_org;
  delete from public.organizations where id = v_org;
  delete from public.shops where id in (v_shop, v_shop2);

  if v_failed > 0 then
    raise exception 'MATRIX-FAILED [%]: % assertions', v_msg, v_failed;
  end if;
  raise notice 'MATRIX-OK';
end
$$ language plpgsql;
