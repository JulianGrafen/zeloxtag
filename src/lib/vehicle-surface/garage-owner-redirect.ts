import { garagePathForVehicle } from "./paths";

const PRESERVED_GARAGE_QUERY_KEYS = [
  "scan",
  "type",
  "tour",
  "session_id",
  "freeScanWelcome",
] as const;

/** Redirect `/v/{vehicleId}` misroutes to garage while keeping scan deep links. */
export function garageOwnerRedirectHref(
  vehicleId: string,
  searchParams: Record<string, string | undefined>,
): string {
  const base = garagePathForVehicle(vehicleId);
  const qs = new URLSearchParams();
  for (const key of PRESERVED_GARAGE_QUERY_KEYS) {
    const value = searchParams[key]?.trim();
    if (value) {
      qs.set(key, value);
    }
  }
  const query = qs.toString();
  return query ? `${base}?${query}` : base;
}
