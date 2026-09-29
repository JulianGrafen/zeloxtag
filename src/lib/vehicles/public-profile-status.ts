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

/** Guest-facing share URL only when a hardware tag is linked. */
export function resolveShowcaseSharePath(input: {
  isPublic: boolean;
  publicSlug: string | null;
  hasActiveTag: boolean;
  pathForSlug: (slug: string) => string;
}): string | null {
  const slug = input.publicSlug?.trim();
  if (!input.isPublic || !slug || !input.hasActiveTag) {
    return null;
  }
  return input.pathForSlug(slug);
}
