/** Short label for showcase settings submenu (owner). */
export function publicProfileStatusSubtitle(input: {
  isPublic: boolean;
  showcaseSwipeOptIn: boolean;
  hasLinkedTag: boolean;
}): string {
  if (input.showcaseSwipeOptIn && input.isPublic) {
    return input.hasLinkedTag ? "Öffentlich" : "Im Build-Swipe";
  }
  if (input.isPublic && input.hasLinkedTag) {
    return "Öffentlich";
  }
  return "Privat";
}

/** Guest-facing share URL at `/v/{public_slug}` when the showcase is public. */
export function resolveShowcaseSharePath(input: {
  isPublic: boolean;
  publicSlug: string | null;
  /** @deprecated Tag no longer required for slug share links; kept for call-site clarity. */
  hasActiveTag?: boolean;
  pathForSlug: (slug: string) => string;
}): string | null {
  const slug = input.publicSlug?.trim();
  if (!input.isPublic || !slug) {
    return null;
  }
  return input.pathForSlug(slug);
}
