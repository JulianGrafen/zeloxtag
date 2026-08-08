import { DOCUMENT_BUCKET } from "@/lib/documents/constants";

/** Fixed object name — one dyno chart PDF per vehicle. */
export function vehicleDynoChartObjectPath(vehicleId: string): string {
  return `${vehicleId}/dyno-chart.pdf`;
}

export function isVehicleDynoChartStoragePath(storagePath: string): boolean {
  return storagePath.endsWith("/dyno-chart.pdf");
}

export { DOCUMENT_BUCKET as DYNO_CHART_BUCKET };
