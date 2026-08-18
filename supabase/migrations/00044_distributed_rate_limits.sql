-- =============================================================================
-- ZeloxTag · Distributed rate limit counters (serverless-safe)
-- Migration: 00044_distributed_rate_limits
-- =============================================================================
-- W5: Shared fixed-window counters across Vercel instances via Postgres.

create table if not exists public.rate_limit_counters (
  bucket_key text primary key,
  window_start bigint not null,
  hit_count integer not null default 0 check (hit_count >= 0),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.rate_limit_counters is
  'Fixed-window rate limit buckets — service role only.';

alter table public.rate_limit_counters enable row level security;
alter table public.rate_limit_counters force row level security;

revoke all on table public.rate_limit_counters from anon, authenticated;

create or replace function public.consume_rate_limit(
  p_bucket_key text,
  p_limit integer,
  p_window_ms bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_now_ms bigint;
  v_window_start bigint;
  v_count integer;
  v_reset_at bigint;
begin
  if p_bucket_key is null or btrim(p_bucket_key) = '' then
    return jsonb_build_object(
      'ok', false,
      'remaining', 0,
      'reset_at', 0,
      'retry_after_sec', 1
    );
  end if;

  if p_limit is null or p_limit < 1 then
    return jsonb_build_object(
      'ok', true,
      'remaining', p_limit,
      'reset_at', 0,
      'retry_after_sec', 0
    );
  end if;

  if p_window_ms is null or p_window_ms < 1000 then
    raise exception 'p_window_ms must be >= 1000';
  end if;

  v_now_ms := floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_window_start := (v_now_ms / p_window_ms) * p_window_ms;

  insert into public.rate_limit_counters as c (bucket_key, window_start, hit_count)
  values (p_bucket_key, v_window_start, 1)
  on conflict (bucket_key) do update
  set
    hit_count = case
      when c.window_start = excluded.window_start then c.hit_count + 1
      else 1
    end,
    window_start = excluded.window_start,
    updated_at = timezone('utc', now())
  returning c.hit_count into v_count;

  v_reset_at := v_window_start + p_window_ms;

  if v_count > p_limit then
    return jsonb_build_object(
      'ok', false,
      'remaining', 0,
      'reset_at', v_reset_at,
      'retry_after_sec', greatest(
        1,
        ceil((v_reset_at - v_now_ms)::numeric / 1000)::integer
      )
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'remaining', greatest(0, p_limit - v_count),
    'reset_at', v_reset_at,
    'retry_after_sec', 0
  );
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, bigint) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, bigint) to service_role;

comment on function public.consume_rate_limit(text, integer, bigint) is
  'Atomically consume one hit from a fixed-window rate limit bucket.';
