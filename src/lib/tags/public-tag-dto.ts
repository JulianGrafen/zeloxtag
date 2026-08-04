import type { Document, Tag, TagScanResult, Vehicle } from "@/types/database";

/**
 * Public QR digital-twin projection — strips ownership / auth identifiers.
 * Guests must never receive `user_id` (or other account handles).
 */
export function toPublicTagScanResult(result: TagScanResult): TagScanResult {
  return {
    tag: toPublicTag(result.tag),
    vehicle: result.vehicle ? toPublicVehicle(result.vehicle) : null,
    documents: result.documents.map(toPublicDocument),
  };
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

function toPublicVehicle(vehicle: Vehicle): Vehicle {
  return {
    id: vehicle.id,
    // Empty string keeps type shape; UI must not treat this as a real owner id.
    user_id: "",
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    vin: vehicle.vin,
    created_at: vehicle.created_at,
    updated_at: vehicle.updated_at,
  };
}

function toPublicDocument(doc: Document): Document {
  return {
    ...doc,
    user_id: "",
  };
}
