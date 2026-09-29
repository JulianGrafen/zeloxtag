import { PRODUCTION_SITE_URL } from "@/lib/constants/public-site-url";

export const CAPACITOR_APP_ID = "de.zeloxtag.app";

export const APP_LINK_HOST = new URL(PRODUCTION_SITE_URL).hostname;

/** Apple Universal Links path patterns (wildcards supported by AASA). */
export const UNIVERSAL_LINK_PATHS = [
  "/v/*",
  "/claim/*",
  "/auth/*",
  "/login",
  "/login/*",
  "/dashboard",
] as const;

export type AppleAppSiteAssociation = {
  applinks: {
    apps: [];
    details: Array<{
      appID: string;
      paths: readonly string[];
    }>;
  };
};

export function buildAppleAppSiteAssociation(
  appleTeamId: string,
): AppleAppSiteAssociation {
  const teamId = appleTeamId.trim();
  if (!teamId) {
    throw new Error("APPLE_TEAM_ID is required.");
  }
  return {
    applinks: {
      apps: [],
      details: [
        {
          appID: `${teamId}.${CAPACITOR_APP_ID}`,
          paths: [...UNIVERSAL_LINK_PATHS],
        },
      ],
    },
  };
}

export type AndroidAssetLinkStatement = {
  relation: ["delegate_permission/common.handle_all_urls"];
  target: {
    namespace: "android_app";
    package_name: string;
    sha256_cert_fingerprints: string[];
  };
};

export function parseAndroidSha256Fingerprints(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,]+/)
    .map((entry) => entry.replace(/:/g, "").trim().toUpperCase())
    .filter((entry) => /^[A-F0-9]{64}$/.test(entry));
}

export function buildAndroidAssetLinks(
  fingerprints: string[],
): AndroidAssetLinkStatement[] {
  const normalized = fingerprints.filter(Boolean);
  if (normalized.length === 0) {
    throw new Error("ANDROID_APP_LINK_SHA256 is required.");
  }
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: CAPACITOR_APP_ID,
        sha256_cert_fingerprints: normalized,
      },
    },
  ];
}

/** Map an incoming app link URL to an in-app router path (same host only). */
export function resolveCapacitorDeepLinkPath(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== APP_LINK_HOST) return null;
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return path.startsWith("/") ? path : `/${path}`;
  } catch {
    return null;
  }
}
