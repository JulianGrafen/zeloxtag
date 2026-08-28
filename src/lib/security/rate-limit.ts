/**
 * Rate limiter for ZeloxTag.
 *
 * Uses Postgres fixed-window counters when Supabase admin is configured
 * (shared across Vercel instances). Falls back to in-memory buckets locally.
 */

import { createHash } from "crypto";

import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSec: number;
};

type Bucket = {
  timestamps: number[];
};

const memoryStore = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

function prune(bucket: Bucket, windowMs: number, now: number) {
  bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < windowMs);
}

function memoryRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  const now = Date.now();
  const bucketKey = input.key;

  if (memoryStore.size > MAX_KEYS) {
    const keys = [...memoryStore.keys()].slice(0, Math.ceil(MAX_KEYS * 0.1));
    for (const key of keys) memoryStore.delete(key);
  }

  let bucket = memoryStore.get(bucketKey);
  if (!bucket) {
    bucket = { timestamps: [] };
    memoryStore.set(bucketKey, bucket);
  }

  prune(bucket, input.windowMs, now);

  if (bucket.timestamps.length >= input.limit) {
    const oldest = bucket.timestamps[0] ?? now;
    const resetAt = oldest + input.windowMs;
    return {
      ok: false,
      remaining: 0,
      resetAt,
      retryAfterSec: Math.max(1, Math.ceil((resetAt - now) / 1000)),
    };
  }

  bucket.timestamps.push(now);
  return {
    ok: true,
    remaining: Math.max(0, input.limit - bucket.timestamps.length),
    resetAt: now + input.windowMs,
    retryAfterSec: 0,
  };
}

function parseRateLimitRpc(value: unknown): RateLimitResult | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.ok !== "boolean") return null;
  return {
    ok: row.ok,
    remaining: typeof row.remaining === "number" ? row.remaining : 0,
    resetAt: typeof row.reset_at === "number" ? row.reset_at : Date.now(),
    retryAfterSec:
      typeof row.retry_after_sec === "number" ? row.retry_after_sec : 0,
  };
}

async function supabaseRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  let admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error("[rate-limit] admin client unavailable", error);
    return memoryRateLimit(input);
  }

  const { data, error } = await admin.rpc("consume_rate_limit", {
    p_bucket_key: input.key,
    p_limit: input.limit,
    p_window_ms: input.windowMs,
  });

  if (error) {
    console.error("[rate-limit] rpc failed — falling back to memory", error.message);
    return memoryRateLimit(input);
  }

  return parseRateLimitRpc(data) ?? memoryRateLimit(input);
}

/** Consume one request from the named bucket for `key`. */
export async function rateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  if (isSupabaseAdminConfigured()) {
    return supabaseRateLimit(input);
  }
  return memoryRateLimit(input);
}

/**
 * Client IP best-effort.
 *
 * Order matters: platform-injected headers first, because a client can send its
 * own `x-forwarded-for` and proxies append rather than replace. Reading the
 * leftmost `x-forwarded-for` entry would let an attacker rotate the value per
 * request and bypass every rate limit. The rightmost entry is the one written
 * by the closest trusted proxy.
 */
export function clientIpFromHeaders(headers: Headers): string {
  const rightmost = (value: string | null | undefined): string | undefined => {
    if (!value) return undefined;
    const parts = value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    return parts.length ? parts[parts.length - 1] : undefined;
  };

  const candidates = [
    rightmost(headers.get("x-vercel-forwarded-for")),
    headers.get("cf-connecting-ip")?.trim(),
    headers.get("x-real-ip")?.trim(),
    rightmost(headers.get("x-forwarded-for")),
  ];
  for (const candidate of candidates) {
    if (candidate) return candidate.slice(0, 64);
  }
  return "unknown";
}

/**
 * Stable client key for auth rate limits.
 * Avoids locking every user behind a shared `unknown` IP when headers are missing.
 */
export function authClientKeyFromHeaders(headers: Headers): string {
  const ip = clientIpFromHeaders(headers);
  if (ip !== "unknown") return ip;

  const ua = headers.get("user-agent")?.trim() ?? "";
  const al = headers.get("accept-language")?.trim() ?? "";
  const digest = createHash("sha256")
    .update(`${ua}|${al}`)
    .digest("hex")
    .slice(0, 16);
  return `anon:${digest}`;
}

export const RATE_LIMITS = {
  /** Login / MFA / password reset. */
  auth: { limit: 30, windowMs: 60_000 },
  /** Expensive Document Intelligence + LLM parse. */
  ocr: { limit: 12, windowMs: 60_000 },
  /** Multipart analyze / storage-bound uploads. */
  upload: { limit: 10, windowMs: 60_000 },
  /** Generic public GET helpers. */
  apiDefault: { limit: 45, windowMs: 60_000 },
  /** Membership claim (legacy Shopify email link). */
  membershipClaim: { limit: 8, windowMs: 10 * 60_000 },
  /** Stripe Checkout / Customer Portal session creation. */
  stripeCheckout: { limit: 8, windowMs: 10 * 60_000 },
  /** Operator tag mint batches. */
  tagMint: { limit: 12, windowMs: 60_000 },
} as const;
