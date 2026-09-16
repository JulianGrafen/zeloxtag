import type { NextRequest } from "next/server";

const CRON_API_PREFIX = "/api/cron/";

/** Vercel Cron invokes these routes with GET + Authorization: Bearer CRON_SECRET. */
export function isCronApiPath(pathname: string, method: string): boolean {
  const verb = method.toUpperCase();
  if (verb !== "GET" && verb !== "HEAD") return false;
  return pathname.startsWith(CRON_API_PREFIX);
}

export function isAuthorizedCronRequest(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization")?.trim();
  return auth === `Bearer ${secret}`;
}
