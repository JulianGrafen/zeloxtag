"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { serviceCategoryLabel } from "@/lib/service/category-presets";
import {
  buildServiceMaintenanceTileMeta,
  pickUrgentServiceAlert,
  type ServiceDueTone,
} from "@/lib/service/service-due-priority";
import type { ServiceRecord, ServiceRecordCategory } from "@/lib/service/service-record";

export type UseServiceHistoryOptions = {
  vehicleId: string;
  initialRecords: ServiceRecord[];
  currentMileageKm: number | null;
};

export function useServiceHistory({
  vehicleId,
  initialRecords,
  currentMileageKm,
}: UseServiceHistoryOptions) {
  const router = useRouter();
  const [categoryFilter, setCategoryFilter] = useState<ServiceRecordCategory | "all">(
    "all",
  );

  const records = initialRecords;

  const filteredRecords = useMemo(() => {
    if (categoryFilter === "all") return records;
    return records.filter((record) => record.category === categoryFilter);
  }, [records, categoryFilter]);

  const recordsByCategory = useMemo(() => {
    const map = new Map<ServiceRecordCategory, ServiceRecord[]>();
    for (const record of records) {
      const list = map.get(record.category) ?? [];
      list.push(record);
      map.set(record.category, list);
    }
    return map;
  }, [records]);

  const dueContext = useMemo(
    () => ({ currentMileageKm }),
    [currentMileageKm],
  );

  const urgentAlert = useMemo(
    () => pickUrgentServiceAlert(records, dueContext),
    [records, dueContext],
  );

  const tileMeta = useMemo(
    () => buildServiceMaintenanceTileMeta(records, dueContext),
    [records, dueContext],
  );

  function refresh() {
    router.refresh();
  }

  function categoryLabel(category: ServiceRecordCategory): string {
    return serviceCategoryLabel(category);
  }

  return {
    vehicleId,
    records,
    filteredRecords,
    recordsByCategory,
    categoryFilter,
    setCategoryFilter,
    urgentAlert,
    tileMeta,
    tileTone: tileMeta.tone as ServiceDueTone | undefined,
    refresh,
    categoryLabel,
  };
}
