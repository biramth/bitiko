-- Security hardening: the three public storage buckets (product-images,
-- shop-assets, category-images) had no `file_size_limit` or
-- `allowed_mime_types` set. The client only used a soft `accept="image/*"`
-- hint on the file input — trivially bypassed by calling
-- supabase.storage.from(...).upload() directly with any file. Any
-- authenticated shop owner could upload arbitrary files (unlimited size, any
-- type, including HTML/SVG with embedded script) to these public,
-- world-readable buckets. Restricts both server-side, where it can't be
-- bypassed from the browser. SVG is deliberately excluded from
-- allowed_mime_types — it can carry embedded <script> and these buckets are
-- public/world-readable.

update storage.buckets
set file_size_limit = 5242880, -- 5 MiB
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id in ('product-images', 'shop-assets', 'category-images');
