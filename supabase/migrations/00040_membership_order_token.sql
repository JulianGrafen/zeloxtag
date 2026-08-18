-- =============================================================================
-- ZeloxTag · Unguessable Shopify order token for membership claim
-- Migration: 00040_membership_order_token
-- Sequential order names (#1001) must never authorize a claim.
-- =============================================================================

alter table public.memberships
  add column if not exists shopify_order_token text null;

comment on column public.memberships.shopify_order_token is
  'Shopify order.token / checkout_token — unguessable; used to link a paid Abo.';

comment on column public.memberships.shopify_order_name is
  'Shopify order.name for display. Sequential names like #1001 are not claim secrets.';

comment on column public.memberships.shopify_order_number is
  'Shopify order.order_number for display only.';

create unique index if not exists memberships_order_token_unique_idx
  on public.memberships (shopify_order_token)
  where shopify_order_token is not null;

drop index if exists memberships_order_number_idx;
