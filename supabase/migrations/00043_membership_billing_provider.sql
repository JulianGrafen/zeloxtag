-- =============================================================================
-- ZeloxTag · Billing provider isolation (Stripe vs legacy Shopify)
-- Migration: 00043_membership_billing_provider
-- =============================================================================
-- W3: Prevent Shopify hardware webhooks from overwriting Stripe Cloud Abo status.

alter table public.memberships
  add column if not exists billing_provider text null
    check (billing_provider in ('stripe', 'shopify'));

comment on column public.memberships.billing_provider is
  'Authoritative billing source: stripe (Cloud Abo) or shopify (legacy hardware checkout).';

create index if not exists memberships_billing_provider_idx
  on public.memberships (billing_provider)
  where billing_provider is not null;
