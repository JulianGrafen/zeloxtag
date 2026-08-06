-- Raise silhouette bucket limits so framed cutout PNGs always fit.
update storage.buckets
set
  file_size_limit = 8388608, -- 8 MB
  allowed_mime_types = array['image/png']::text[]
where id = 'vehicle-silhouettes';
