"use client";

import { InvoiceUploader } from "@/components/dashboard/InvoiceUploader";
import { getMockTagScan, MOCK_TAG_UUIDS } from "@/lib/tags/mock-tags";

const mock = getMockTagScan(MOCK_TAG_UUIDS.active);

export function AbeScanDevPreview() {
  if (!mock?.vehicle) {
    return null;
  }

  const vehicle = mock.vehicle;
  const vehicleLabel = `${vehicle.make} ${vehicle.model}`;

  return (
    <InvoiceUploader
      vehicleId={vehicle.id}
      tagUuid={mock.tag.uuid}
      vehicleLabel={vehicleLabel}
      vehicleMake={vehicle.make}
      vehicleModel={vehicle.model}
      vehicleVin={vehicle.vin}
      existingDocuments={mock.documents}
      backHref="/dev/abe-scan"
      dashboardHomeHref="/dev/abe-scan"
      backLabel="Dev"
      onBack={() => {
        window.location.href = "/dev/abe-scan";
      }}
      scanType="abe"
      dashboardQuickScan
    />
  );
}
