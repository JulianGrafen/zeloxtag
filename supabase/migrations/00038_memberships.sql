-- =============================================================================
-- ZeloxTag · Shopify memberships (paid Cloud Abo)
-- Migration: 00038_memberships
-- =============================================================================
-- Shopify is the checkout; this app is the source of truth for entitlements.
-- Writes: service role (webhook). Reads: owner row only.
-- =============================================================================

create table if not exists public.memberships (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid unique references auth.users (id) on delete set null,
  email text not null,
  shopify_customer_id text null,
  shopify_order_id text null,
  shopify_product_id text null,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'past_due', 'canceled')),
  current_period_end timestamptz null,
  paid_at timestamptz null,
  canceled_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint memberships_email_normalized check (email = lower(email))
);

create unique index if not exists memberships_email_unique_idx
  on public.memberships (email);

create index if not exists memberships_user_id_idx
  on public.memberships (user_id)
  where user_id is not null;

create index if not exists memberships_status_idx
  on public.memberships (status);

comment on table public.memberships is
  'Paid ZeloxTag Cloud membership, synced from Shopify webhooks.';

drop trigger if exists memberships_set_updated_at on public.memberships;
create trigger memberships_set_updated_at
  before update on public.memberships
  for each row
  execute function public.update_updated_at_column();

-- Idempotent webhook delivery (Shopify retries).
create table if not exists public.shopify_webhook_events (
  id text primary key,
  topic text not null,
  processed_at timestamptz not null default timezone('utc', now())
);

comment on table public.shopify_webhook_events is
  'Shopify webhook ids already applied — prevents double grants on retry.';

alter table public.memberships enable row level security;
alter table public.memberships force row level security;
alter table public.shopify_webhook_events enable row level security;
alter table public.shopify_webhook_events force row level security;

revoke all on table public.memberships from anon, authenticated;
revoke all on table public.shopify_webhook_events from anon, authenticated;
grant select on table public.memberships to authenticated;

drop policy if exists "memberships_select_own" on public.memberships;
create policy "memberships_select_own" on public.memberships
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Match Shopify checkout email to an existing ZeloxTag account.
create or replace function public.find_user_id_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = auth, public
set row_security = off
as $$
  select id
  from auth.users
  where lower(email) = lower(trim(p_email))
  limit 1;
$$;

revoke all on function public.find_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.find_user_id_by_email(text) to service_role;

comment on function public.find_user_id_by_email(text) is
  'Service-role lookup of auth.users.id by email for Shopify membership linking.';

-- If they pay in Shopify first, then sign up with the same email, attach the row.
create or replace function public.link_membership_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if new.email is null or length(trim(new.email)) = 0 then
    return new;
  end if;

  update public.memberships
  set
    user_id = new.id,
    updated_at = timezone('utc', now())
  where user_id is null
    and email = lower(trim(new.email));

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_link_membership on auth.users;
create trigger on_auth_user_created_link_membership
  after insert on auth.users
  for each row
  execute function public.link_membership_on_signup();
