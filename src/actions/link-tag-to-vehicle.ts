"use server";

import { headers } from "next/headers";

import { linkTagToVehicleForOwner } from "@/lib/hardware/link-tag-to-vehicle";
import {
  authClientKeyFromHeaders,
  rateLimit,
  RATE_LIMITS,
} from "@/lib/security/rate-limit";

export type LinkTagToVehicleResult =
  | { status: "error"; message: string }
  | { status: "linked"; tagUuid: string; href: string };

export async function linkTagToVehicleAction(input: {
  tagUuid: string;
  vehicleId: string;
}): Promise<LinkTagToVehicleResult> {
  const headerStore = await headers();
  const clientKey = authClientKeyFromHeaders(headerStore);
  const cfg = RATE_LIMITS.auth;
  const limited = await rateLimit({
    key: `hardware:link:${clientKey}`,
    limit: cfg.limit,
    windowMs: cfg.windowMs,
  });
  if (!limited.ok) {
    return {
      status: "error",
      message: `Zu viele Versuche. Bitte in ${limited.retryAfterSec}s erneut versuchen.`,
    };
  }

  const result = await linkTagToVehicleForOwner(input);
  if (result.status === "error") {
    return result;
  }

  return {
    status: "linked",
    tagUuid: result.tagUuid,
    href: `/v/${result.tagUuid}`,
  };
}
