-- Existing public showcases with hero image → eligible for /swipe deck.
-- (Previously many owners had is_public without showcase_swipe_opt_in.)

update public.vehicles
set showcase_swipe_opt_in = true
where is_public = true
  and showcase_swipe_opt_in = false
  and public_slug is not null
  and btrim(public_slug) <> ''
  and silhouette_image_url is not null
  and btrim(silhouette_image_url) <> '';
