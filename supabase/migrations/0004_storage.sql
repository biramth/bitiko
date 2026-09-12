-- Storage buckets for product photos and the shop logo. Both are public
-- buckets (product photos and the logo are meant to be publicly viewable on
-- the storefront) — writes are still gated by RLS-style policies on
-- storage.objects below, scoped to the objects the owner actually owns.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('shop-assets', 'shop-assets', true)
on conflict (id) do nothing;

-- product-images: path is "<product_id>/<filename>"
create policy "product-images: public read" on storage.objects
  for select using (bucket_id = 'product-images');

create policy "product-images: owner insert" on storage.objects
  for insert with check (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.products p
      join public.shops s on s.id = p.shop_id
      where p.id::text = (storage.foldername(name))[1]
        and s.owner_id = auth.uid()
    )
  );

create policy "product-images: owner delete" on storage.objects
  for delete using (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.products p
      join public.shops s on s.id = p.shop_id
      where p.id::text = (storage.foldername(name))[1]
        and s.owner_id = auth.uid()
    )
  );

-- shop-assets: path is "<shop_id>/logo.<ext>"
create policy "shop-assets: public read" on storage.objects
  for select using (bucket_id = 'shop-assets');

create policy "shop-assets: owner write" on storage.objects
  for insert with check (
    bucket_id = 'shop-assets'
    and exists (
      select 1 from public.shops s
      where s.id::text = (storage.foldername(name))[1]
        and s.owner_id = auth.uid()
    )
  );

create policy "shop-assets: owner update" on storage.objects
  for update using (
    bucket_id = 'shop-assets'
    and exists (
      select 1 from public.shops s
      where s.id::text = (storage.foldername(name))[1]
        and s.owner_id = auth.uid()
    )
  );

create policy "shop-assets: owner delete" on storage.objects
  for delete using (
    bucket_id = 'shop-assets'
    and exists (
      select 1 from public.shops s
      where s.id::text = (storage.foldername(name))[1]
        and s.owner_id = auth.uid()
    )
  );
