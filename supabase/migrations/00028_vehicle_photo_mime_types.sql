-- Allow JPEG/WebP vehicle photos (not only transparent PNG cutouts).
update storage.buckets
set allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']::text[]
where id = 'vehicle-silhouettes';
