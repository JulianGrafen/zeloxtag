import {
  DEMO_SHOWCASE_ROUTES,
  isDemoActiveTag,
} from "@/lib/tags/demo-showcase";
import { MOCK_TAG_UUIDS } from "@/lib/tags/mock-tags";

const FALLBACK = "/dashboard";

/** Public showcase routes — never a post-auth destination for real accounts. */
export function isDemoOrShowcasePath(path: string): boolean {
  const trimmed = path.trim();
  if (trimmed === "/demo" || trimmed.startsWith("/demo/")) return true;

  const showcaseRoots = [
    DEMO_SHOWCASE_ROUTES.invoices,
    DEMO_SHOWCASE_ROUTES.abe,
    DEMO_SHOWCASE_ROUTES.intervals,
  ];
  if (
    showcaseRoots.some(
      (root) => trimmed === root || trimmed.startsWith(`${root}/`),
    )
  ) {
    return true;
  }

  const tagMatch = trimmed.match(/^\/v\/([^/?#]+)/);
  const tagUuid = tagMatch?.[1]?.trim();
  if (!tagUuid) return false;

  return (
    isDemoActiveTag(tagUuid) || tagUuid === MOCK_TAG_UUIDS.unclaimed
  );
}

/** Never send authenticated users to public showcase surfaces. */
export function sanitizePostLoginPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return FALLBACK;
  }
  if (isDemoOrShowcasePath(trimmed)) {
    return FALLBACK;
  }
  return trimmed;
}

/** Normalize `next` on `/auth/callback` — demo/showcase → `/auth/continue`. */
export function normalizeAuthCallbackNext(nextRaw: string): string {
  const trimmed = nextRaw.trim();
  const path =
    trimmed.startsWith("/") && !trimmed.startsWith("//")
      ? trimmed
      : "/auth/continue";
  if (isGenericPostLoginNext(path)) return "/auth/continue";
  return sanitizePostLoginPath(path);
}

/** True when `next` is a generic post-login target (not a deep link). */
export function isGenericPostLoginNext(path: string): boolean {
  if (isDemoOrShowcasePath(path)) return true;

  return (
    path === "/" ||
    path === "/login" ||
    path === "/login/mfa" ||
    path === "/dashboard" ||
    path === "/auth/continue"
  );
}
