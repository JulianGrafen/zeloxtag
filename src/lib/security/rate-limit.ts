/**
 * Distributed sliding-window rate limiter.
 * Uses Upstash Redis when configured; otherwise in-memory (per instance).
 * Prefer UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN on Vercel so
 * limits stay accurate across cold starts / multiple instances.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

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

const upstashLimiters = new Map<string, Ratelimit>();
let warnedMissingRedis = false;
let warnedUpstashError = false;

function prune(bucket: Bucket, windowMs: number, now: number) {
  bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < windowMs);
}

function isUpstashConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  );
}

function windowToUpstashDuration(windowMs: number): `${number} s` {
  const seconds = Math.max(1, Math.ceil(windowMs / 1000));
  return `${seconds} s`;
}

function getUpstashLimiter(limit: number, windowMs: number): Ratelimit {
  const key = `${limit}:${windowMs}`;
  const existing = upstashLimiters.get(key);
  if (existing) return existing;

  const limiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(limit, windowToUpstashDuration(windowMs)),
    prefix: "zeloxtag:rl",
    analytics: false,
    ephemeralCache: new Map(),
  });
  upstashLimiters.set(key, limiter);
  return limiter;
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

function warnMemoryFallback(reason: string) {
  if (process.env.VERCEL_ENV !== "production") return;
  if (reason === "missing" && !warnedMissingRedis) {
    warnedMissingRedis = true;
    console.warn(
      "[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN missing — using in-memory limits (weaker on multi-instance).",
    );
  }
  if (reason === "error" && !warnedUpstashError) {
    warnedUpstashError = true;
    console.warn(
      "[rate-limit] Upstash error — falling back to in-memory limits for this request.",
    );
  }
}

/**
 * Consume one request from the named bucket for `key`.
 * Prefer awaiting this everywhere — Redis path is async.
 */
export async function rateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  if (isUpstashConfigured()) {
    try {
      const limiter = getUpstashLimiter(input.limit, input.windowMs);
      const result = await limiter.limit(input.key);
      const resetAt = result.reset;
      const retryAfterSec = result.success
        ? 0
        : Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
      return {
        ok: result.success,
        remaining: result.remaining,
        resetAt,
        retryAfterSec,
      };
    } catch (error) {
      console.error("[rate-limit] Upstash error", error);
      warnMemoryFallback("error");
      return memoryRateLimit(input);
    }
  }

  warnMemoryFallback("missing");
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

export const RATE_LIMITS = {
  /** Login / MFA / password reset — brute-force resistance. */
  auth: { limit: 20, windowMs: 60_000 },
  /** Expensive Document Intelligence + LLM parse. */
  ocr: { limit: 12, windowMs: 60_000 },
  /** Multipart analyze / storage-bound uploads. */
  upload: { limit: 10, windowMs: 60_000 },
  /** Generic public GET helpers. */
  apiDefault: { limit: 45, windowMs: 60_000 },
} as const;
