-- =============================================================================
-- ZeloxTag · Stripe Cloud Abo (source of truth for entitlements)
-- Migration: 00041_stripe_memberships
-- Shopify remains the hardware shop. Recurring Cloud billing is Stripe.
-- =============================================================================

alter table public.memberships
  add column if not exists stripe_customer_id text null,
  add column if not exists stripe_subscription_id text null,
  add column if not exists stripe_price_id text null;

comment on column public.memberships.stripe_customer_id is
  'Stripe Customer id (cus_…).';
comment on column public.memberships.stripe_subscription_id is
  'Stripe Subscription id (sub_…).';
comment on column public.memberships.stripe_price_id is
  'Stripe Price id for the Cloud Abo (price_…).';

create unique index if not exists memberships_stripe_customer_unique_idx
  on public.memberships (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists memberships_stripe_subscription_unique_idx
  on public.memberships (stripe_subscription_id)
  where stripe_subscription_id is not null;

create table if not exists public.stripe_webhook_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default timezone('utc', now())
);

comment on table public.stripe_webhook_events is
  'Stripe event ids already applied — prevents double grants on retry.';

alter table public.stripe_webhook_events enable row level security;
alter table public.stripe_webhook_events force row level security;

revoke all on table public.stripe_webhook_events from anon, authenticated;
