import type { VehicleAccess } from "@/lib/auth/vehicle-access";
import { vehicleCatalogImageUrl } from "@/lib/vehicles/vehicle-image";

import { MOCK_TAG_UUIDS } from "./mock-tags";

/** Canonical QR entry for the public BMW E36 showcase twin. */
export const DEMO_SHOWCASE_BACK_HREF = `/v/${MOCK_TAG_UUIDS.active}`;

/** Legacy public list routes (still reachable directly). */
export const DEMO_SHOWCASE_ROUTES = {
  invoices: "/rechnungen",
  abe: "/abe",
  intervals: "/intervalle",
} as const;

export function isDemoActiveTag(tagUuid: string): boolean {
  return tagUuid.trim() === MOCK_TAG_UUIDS.active;
}

/** Display name in the public demo dashboard header. */
export const DEMO_SHOWCASE_OWNER_NAME = "Julian";

/** Side-profile cutout for the public E36 showcase — no UI photo frame. */
export const DEMO_SHOWCASE_VEHICLE_IMAGE = vehicleCatalogImageUrl(
  "bmw-e36.png",
);

/** Guest access for the public E36 showcase — browse all surfaces, no writes. */
export function demoShowcaseAccess(): VehicleAccess {
  return {
    isOwner: false,
    isContributor: false,
    canWriteInvoices: false,
    canReadHistory: true,
    canManageContributors: false,
    ownerName: DEMO_SHOWCASE_OWNER_NAME,
    sessionEmail: null,
    sessionUserId: null,
  };
}
