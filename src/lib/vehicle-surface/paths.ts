import type { VehicleSurfaceScope } from "./types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isVehicleId(value: string): boolean {
  return UUID_RE.test(value.trim());
}

/** Canonical owner base path: QR tag when linked, else digital garage. */
export function vehicleSurfaceBasePath(scope: VehicleSurfaceScope): string {
  const tag = scope.linkedTagUuid?.trim();
  if (tag) {
    return `/v/${tag}`;
  }
  return `/garage/${scope.vehicleId}`;
}

/** Append a sub-path segment (with or without leading slash). */
export function vehicleSurfaceHref(
  scope: VehicleSurfaceScope,
  segment?: string,
): string {
  const base = vehicleSurfaceBasePath(scope);
  if (!segment?.trim()) {
    return base;
  }
  const trimmed = segment.trim();
  if (trimmed.startsWith("?")) {
    return `${base}${trimmed}`;
  }
  const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${base}${normalized}`;
}

export function garagePathForVehicle(vehicleId: string, segment?: string): string {
  return vehicleSurfaceHref(
    { vehicleId, linkedTagUuid: null },
    segment,
  );
}

export function scopeFromGarageRoute(vehicleId: string): VehicleSurfaceScope {
  return { vehicleId: vehicleId.trim(), linkedTagUuid: null };
}
