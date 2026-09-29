/** Owner dashboard scope — tag optional until hardware is linked. */
export type VehicleSurfaceScope = {
  vehicleId: string;
  linkedTagUuid: string | null;
};

export type VehicleSurfaceRouteRef =
  | { kind: "tag"; tagUuid: string }
  | { kind: "garage"; vehicleId: string };
