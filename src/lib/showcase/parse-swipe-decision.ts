import type { ShowcaseSwipeDecision } from "@/lib/showcase/swipe-types";

export function parseShowcaseSwipeDecision(
  raw: unknown,
): ShowcaseSwipeDecision | null {
  if (raw === "like" || raw === "pass") return raw;
  return null;
}
