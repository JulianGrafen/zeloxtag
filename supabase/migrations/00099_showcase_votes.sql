-- =============================================================================
-- ZeloxTag · Public showcase votes (one per visitor per vehicle, forever)
-- Migration: 00099_showcase_votes
--
-- Public vote total = showcase votes
--                   + distinct registered Build-Swipe likers
--                   + distinct anonymous Build-Swipe sessions that liked.
-- Writes go through the Next.js API (service role) which rate-limits per client.
-- =============================================================================

create table if not exists public.showcase_votes (
  id uuid primary key default uuid_generate_v4(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  -- sha256 hex of `user:{id}` (signed in) or the anonymous browser session id.
  voter_hash text not null check (voter_hash ~ '^[a-f0-9]{64}$'),
  user_id uuid null references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint showcase_votes_unique_voter unique (vehicle_id, voter_hash)
);

create index if not exists showcase_votes_vehicle_idx
  on public.showcase_votes (vehicle_id);

comment on table public.showcase_votes is
  'Public showcase votes. Service role only; totals via showcase_vote_total().';

alter table public.showcase_votes enable row level security;
alter table public.showcase_votes force row level security;
revoke all on table public.showcase_votes from anon, authenticated;

create or replace function public.showcase_vote_total(p_vehicle_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $fn$
  select case
    when not exists (
      select 1 from public.vehicles v
      where v.id = p_vehicle_id and v.is_public
    ) then 0
    else (
      (select count(*) from public.showcase_votes sv
        where sv.vehicle_id = p_vehicle_id)
      + (select count(distinct s.swiper_user_id) from public.showcase_swipes s
        where s.vehicle_id = p_vehicle_id and s.decision = 'like')
      + (select count(distinct a.client_session_hash)
        from public.anonymous_showcase_swipes a
        where a.vehicle_id = p_vehicle_id and a.decision = 'like')
    )::int
  end;
$fn$;

revoke all on function public.showcase_vote_total(uuid) from public;
grant execute on function public.showcase_vote_total(uuid) to service_role;

create or replace function public.cast_showcase_vote(
  p_vehicle_id uuid,
  p_voter_hash text,
  p_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_owner uuid;
  v_inserted int;
begin
  if p_voter_hash is null or p_voter_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid voter_hash';
  end if;

  select v.user_id into v_owner
  from public.vehicles v
  where v.id = p_vehicle_id and v.is_public;

  if not found then
    raise exception 'vehicle not public';
  end if;

  if p_user_id is not null and p_user_id = v_owner then
    return jsonb_build_object(
      'ok', false,
      'reason', 'own_vehicle',
      'total', public.showcase_vote_total(p_vehicle_id)
    );
  end if;

  insert into public.showcase_votes (vehicle_id, voter_hash, user_id)
  values (p_vehicle_id, p_voter_hash, p_user_id)
  on conflict on constraint showcase_votes_unique_voter do nothing;

  get diagnostics v_inserted = row_count;

  return jsonb_build_object(
    'ok', true,
    'already_voted', v_inserted = 0,
    'total', public.showcase_vote_total(p_vehicle_id)
  );
end;
$fn$;

revoke all on function public.cast_showcase_vote(uuid, text, uuid) from public;
grant execute on function public.cast_showcase_vote(uuid, text, uuid) to service_role;
