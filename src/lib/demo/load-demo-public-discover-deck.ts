import "server-only";

import { loadPublicSwipeCards } from "@/lib/public-swipe/load-public-swipe-cards";
import { publicSwipeCardToShowcaseCard } from "@/lib/public-swipe/public-swipe-card-map";
import type { ShowcaseSwipeCard } from "@/lib/showcase/swipe-types";

/** Anonymous-safe swipe deck (same source as /swipe). */
export async function loadDemoPublicDiscoverDeck(
  limit = 15,
): Promise<ShowcaseSwipeCard[]> {
  const cards = await loadPublicSwipeCards({
    limit: Math.min(20, Math.max(1, limit)),
  });
  return cards.map(publicSwipeCardToShowcaseCard);
}
