-- Category tiles: optional custom background color and cover image.
alter table public.categories
  add column color text,
  add column image_url text;

-- Public bucket for category cover images.
-- Path convention: "<category_id>/<filename>" — same pattern as product photos.
insert into storage.buckets (id, name, public)
values ('category-images', 'category-images', true)
on conflict (id) do nothing;

create policy "category-images: public read" on storage.objects
  for select using (bucket_id = 'category-images');

create policy "category-images: owner insert" on storage.objects
  for insert with check (
    bucket_id = 'category-images'
    and exists (
      select 1 from public.categories c
      join public.shops s on s.id = c.shop_id
      where c.id::text = (storage.foldername(storage.objects.name))[1]
        and s.owner_id = auth.uid()
    )
  );

create policy "category-images: owner delete" on storage.objects
  for delete using (
    bucket_id = 'category-images'
    and exists (
      select 1 from public.categories c
      join public.shops s on s.id = c.shop_id
      where c.id::text = (storage.foldername(storage.objects.name))[1]
        and s.owner_id = auth.uid()
    )
  );