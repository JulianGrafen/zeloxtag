export type VehicleShowcaseSwipeDailyStats = {
  vehicleId: string;
  swipeCount: number;
  likeRatePercent: number;
};

export type VehicleShowcaseSwipeDailyStatsRow = {
  vehicle_id: string;
  swipe_count: number;
  like_rate_percent: number;
};

export function mapVehicleShowcaseSwipeDailyStatsRow(
  row: unknown,
): VehicleShowcaseSwipeDailyStats | null {
  if (!row || typeof row !== "object") return null;

  const record = row as VehicleShowcaseSwipeDailyStatsRow;
  const vehicleId = String(record.vehicle_id ?? "").trim();
  const swipeCount = Math.floor(Number(record.swipe_count));
  const likeRatePercent = Math.floor(Number(record.like_rate_percent));

  if (!vehicleId) return null;
  if (!Number.isFinite(swipeCount) || swipeCount < 1) return null;
  if (!Number.isFinite(likeRatePercent) || likeRatePercent < 0 || likeRatePercent > 100) {
    return null;
  }

  return { vehicleId, swipeCount, likeRatePercent };
}
