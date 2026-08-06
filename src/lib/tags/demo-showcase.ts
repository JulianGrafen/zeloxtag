import { MOCK_TAG_UUIDS } from "./mock-tags";

/** Canonical QR entry for the public Supra showcase twin. */
export const DEMO_SHOWCASE_BACK_HREF = `/v/${MOCK_TAG_UUIDS.active}`;

/** Public read-only demo routes (no auth) for invoices, ABEs, and oil intervals. */
export const DEMO_SHOWCASE_ROUTES = {
  invoices: "/rechnungen",
  abe: "/abe",
  intervals: "/intervalle",
} as const;

export function demoShowcaseHrefForTile(
  tileId: string,
): string | undefined {
  switch (tileId) {
    case "invoices":
      return DEMO_SHOWCASE_ROUTES.invoices;
    case "abe":
      return DEMO_SHOWCASE_ROUTES.abe;
    case "oil-change":
      return DEMO_SHOWCASE_ROUTES.intervals;
    default:
      return undefined;
  }
}
