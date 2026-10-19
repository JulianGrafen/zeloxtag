import "server-only";

import {
  parseRevenueCatSubscriberResponse,
  resolveRevenueCatEntitlementId,
  type RevenueCatSubscriberSnapshot,
} from "@/lib/billing/revenuecat-membership";

function readSecretApiKey(): string | null {
  const value = process.env.REVENUECAT_SECRET_API_KEY?.trim();
  return value || null;
}

export function isRevenueCatServerConfigured(): boolean {
  return Boolean(readSecretApiKey());
}

export function verifyRevenueCatWebhookAuthorization(
  header: string | null,
  secret: string,
): boolean {
  if (!header?.trim() || !secret) return false;
  const trimmed = header.trim();
  if (trimmed === secret) return true;
  const bearer = trimmed.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  return bearer === secret;
}

export async function fetchRevenueCatSubscriber(
  appUserId: string,
): Promise<RevenueCatSubscriberSnapshot | null> {
  const apiKey = readSecretApiKey();
  if (!apiKey) return null;

  const encoded = encodeURIComponent(appUserId.trim());
  const response = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encoded}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    console.error(
      "[revenuecat] subscriber fetch failed",
      response.status,
      appUserId,
    );
    return null;
  }

  const json = (await response.json()) as unknown;
  return parseRevenueCatSubscriberResponse(
    appUserId,
    json,
    resolveRevenueCatEntitlementId(),
  );
}
