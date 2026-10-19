-- RevenueCat (App Store / Play) membership sync — Platform Module 1b

alter table public.memberships
  drop constraint if exists memberships_billing_provider_check;

alter table public.memberships
  add constraint memberships_billing_provider_check
  check (
    billing_provider is null
    or billing_provider in ('stripe', 'shopify', 'revenuecat')
  );

alter table public.memberships
  add column if not exists revenuecat_app_user_id text null,
  add column if not exists revenuecat_product_id text null;

comment on column public.memberships.revenuecat_app_user_id is
  'Supabase auth user id used as RevenueCat app_user_id.';
comment on column public.memberships.revenuecat_product_id is
  'Store product id from RevenueCat (App Store / Play).';

create index if not exists memberships_revenuecat_app_user_id_idx
  on public.memberships (revenuecat_app_user_id)
  where revenuecat_app_user_id is not null;

create table if not exists public.revenuecat_webhook_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default timezone('utc', now())
);

comment on table public.revenuecat_webhook_events is
  'RevenueCat webhook event ids already applied — idempotent retries.';

alter table public.revenuecat_webhook_events enable row level security;
alter table public.revenuecat_webhook_events force row level security;

revoke all on table public.revenuecat_webhook_events from anon, authenticated;
