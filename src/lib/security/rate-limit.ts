/**
 * In-memory rate limiter for ZeloxTag.
 *
 * Limits are per server instance (suitable for single-node dev and modest
 * serverless concurrency). Auth buckets use a stable client key so missing
 * proxy headers do not collapse all users into one bucket.
 */

import { createHash } from "crypto";

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

/** Consume one request from the named bucket for `key`. */
export async function rateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  return memoryRateLimit(input);
}

/** Client IP best-effort (Vercel / proxy / CDN headers). */
export function clientIpFromHeaders(headers: Headers): string {
  const candidates = [
    headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    headers.get("x-real-ip")?.trim(),
    headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim(),
    headers.get("cf-connecting-ip")?.trim(),
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
} as const;
