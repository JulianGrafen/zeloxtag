/**
 * In-memory sliding-window rate limiter (single Node process).
 * For multi-instance production, replace with Upstash Redis / edge KV.
 *
 * Supabase Auth also enforces its own email/OTP rate limits server-side —
 * configure those in the Supabase dashboard (Auth → Rate Limits).
 */

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSec: number;
};

type Bucket = {
  timestamps: number[];
};

const store = new Map<string, Bucket>();

const MAX_KEYS = 10_000;

function prune(bucket: Bucket, windowMs: number, now: number) {
  bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < windowMs);
}

/**
 * Consume one request from the named bucket for `key`.
 */
export function rateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  const now = Date.now();
  const bucketKey = input.key;

  if (store.size > MAX_KEYS) {
    // Drop oldest ~10% of keys under memory pressure.
    const keys = [...store.keys()].slice(0, Math.ceil(MAX_KEYS * 0.1));
    for (const key of keys) store.delete(key);
  }

  let bucket = store.get(bucketKey);
  if (!bucket) {
    bucket = { timestamps: [] };
    store.set(bucketKey, bucket);
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

/** Client IP best-effort (proxy / edge headers). */
export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 64);
  return "unknown";
}

export const RATE_LIMITS = {
  auth: { limit: 8, windowMs: 60_000 },
  ocr: { limit: 20, windowMs: 60_000 },
  upload: { limit: 15, windowMs: 60_000 },
  apiDefault: { limit: 60, windowMs: 60_000 },
} as const;
