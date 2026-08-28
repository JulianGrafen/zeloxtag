import type { Document, Tag, TagScanResult, Vehicle } from "@/types/database";

/**
 * Client-safe projections for the QR digital twin.
 *
 * High-security rule: non-owners never receive invoices, PDFs, VIN,
 * financial fields, or document metadata — only public vehicle identity.
 */

export function toOwnerClientTagScanResult(result: TagScanResult): TagScanResult {
  return {
    tag: toPublicTag(result.tag),
    vehicle: result.vehicle ? toOwnerClientVehicle(result.vehicle) : null,
    documents: result.documents.map(toOwnerClientDocument),
  };
}

/**
 * Guest / foreign-account projection — empty document list, no VIN / owner id.
 */
export function toGuestClientTagScanResult(result: TagScanResult): TagScanResult {
  return {
    tag: toPublicTag(result.tag),
    vehicle: result.vehicle ? toGuestClientVehicle(result.vehicle) : null,
    documents: [],
  };
}

/**
 * Schrauber projection — dashboard access without owner-only identifiers.
 * A contributor must never receive the VIN or the exposé share token, since
 * either lets them act outside the vehicle they were invited to.
 */
export function toContributorClientTagScanResult(
  result: TagScanResult,
): TagScanResult {
  return {
    tag: toPublicTag(result.tag),
    vehicle: result.vehicle
      ? {
          ...result.vehicle,
          user_id: "",
          vin: null,
          expose_token: null,
          is_expose_active: false,
        }
      : null,
    documents: result.documents.map(toOwnerClientDocument),
  };
}

/** @deprecated Use {@link toGuestClientTagScanResult} / {@link toOwnerClientTagScanResult}. */
export function toPublicTagScanResult(result: TagScanResult): TagScanResult {
  return toGuestClientTagScanResult(result);
}

function toPublicTag(tag: Tag): Tag {
  return {
    id: tag.id,
    uuid: tag.uuid,
    vehicle_id: tag.vehicle_id,
    status: tag.status,
    created_at: tag.created_at,
    updated_at: tag.updated_at,
  };
}

function toOwnerClientVehicle(vehicle: Vehicle): Vehicle {
  return {
    ...vehicle,
    // Never hydrate auth subject ids into the browser tree.
    user_id: "",
  };
}

function toGuestClientVehicle(vehicle: Vehicle): Vehicle {
  return {
    id: vehicle.id,
    user_id: "",
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    vin: null,
    tech_specs: vehicle.tech_specs ?? null,
    silhouette_image_url: vehicle.silhouette_image_url ?? null,
    is_public: Boolean(vehicle.is_public),
    hide_financials: vehicle.hide_financials !== false,
    public_slug:
      typeof vehicle.public_slug === "string" ? vehicle.public_slug : null,
    expose_token: null,
    is_expose_active: false,
    created_at: vehicle.created_at,
    updated_at: vehicle.updated_at,
  };
}

function toOwnerClientDocument(doc: Document): Document {
  return {
    ...doc,
    user_id: "",
    created_by: null,
  };
}
