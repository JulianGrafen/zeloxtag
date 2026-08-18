-- =============================================================================
-- ZeloxTag · Membership claim (link Shopify payment to any ZeloxTag user)
-- Migration: 00039_membership_claim
-- =============================================================================

alter table public.memberships
  add column if not exists shopify_order_name text null,
  add column if not exists shopify_order_number text null,
  add column if not exists claim_token text null;

comment on column public.memberships.shopify_order_name is
  'Shopify order.name, e.g. #1001 — used when claiming from Settings.';
comment on column public.memberships.shopify_order_number is
  'Shopify order.order_number as text.';
comment on column public.memberships.claim_token is
  'Unguessable one-time token emailed to the Shopify checkout address.';

create unique index if not exists memberships_claim_token_unique_idx
  on public.memberships (claim_token)
  where claim_token is not null;

create index if not exists memberships_order_number_idx
  on public.memberships (shopify_order_number)
  where shopify_order_number is not null;
