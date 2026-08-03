import { notFound } from "next/navigation";

import { OilIntervalDetailView } from "@/components/vehicle-dashboard/OilIntervalDetailView";
import { getOilChangeRecord } from "@/components/vehicle-dashboard/oilChangeRecords";

interface OilIntervalDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function OilIntervalDetailPage({
  params,
}: OilIntervalDetailPageProps) {
  const { id } = await params;
  const record = getOilChangeRecord(id);

  if (!record) {
    notFound();
  }

  return (
    <OilIntervalDetailView record={record} vehicleModel="RX-8" />
  );
}
