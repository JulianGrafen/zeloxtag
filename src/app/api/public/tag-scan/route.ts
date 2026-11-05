import { after, NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  RATE_LIMITS,
  authClientKeyFromHeaders,
  rateLimit,
} from "@/lib/security/rate-limit";
import { recordTagScan } from "@/lib/tags/record-tag-scan";
import {
  TAG_SCAN_CLIENT_DEDUPE_MS,
  isLikelyBotUserAgent,
  tagScanLocationFromHeaders,
} from "@/lib/tags/tag-scan-notify";

export const runtime = "nodejs";

const bodySchema = z.object({
  tagUuid: z.string().trim().min(1).max(64),
});

/**
 * Live-Scan beacon, fired client-side from the guest view of `/v/{tagUuid}`.
 * Always answers 204 so callers cannot probe tag ownership or mail state.
 */
export async function POST(request: NextRequest) {
  const accepted = new NextResponse(null, { status: 204 });

  if (isLikelyBotUserAgent(request.headers.get("user-agent"))) {
    return accepted;
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return accepted;
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return accepted;
  }
  const { tagUuid } = parsed.data;

  const clientKey = authClientKeyFromHeaders(request.headers);
  const perClient = await rateLimit({
    key: `tag-scan:${clientKey}`,
    limit: RATE_LIMITS.tagScan.limit,
    windowMs: RATE_LIMITS.tagScan.windowMs,
  });
  if (!perClient.ok) {
    return accepted;
  }

  // One scan per visitor per tag per window — reloads and back-navigation don't count.
  const perTag = await rateLimit({
    key: `tag-scan-dedupe:${clientKey}:${tagUuid}`,
    limit: 1,
    windowMs: TAG_SCAN_CLIENT_DEDUPE_MS,
  });
  if (!perTag.ok) {
    return accepted;
  }

  const location = tagScanLocationFromHeaders(request.headers);

  after(async () => {
    try {
      await recordTagScan({ tagUuid, location });
    } catch (error) {
      console.error("[tag-scan] record failed", error);
    }
  });

  return accepted;
}
