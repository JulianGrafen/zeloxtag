/** One owned active tag + linked vehicle in the user's garage. */
export type GarageVehicle = {
  vehicleId: string;
  /** Null until a V4A tag is linked. */
  tagUuid: string | null;
  make: string;
  model: string;
  year: number | null;
  /** Display line for switcher UI (make/model, deduped). */
  label: string;
  /** Side-profile cutout (owner upload, catalog, or undefined → SVG fallback). */
  imageSrc?: string;
  imageAlt: string;
};

export type GarageState = {
  userVehicles: GarageVehicle[];
  activeVehicleId: string | null;
  isLoading: boolean;
  error: string | null;
};
