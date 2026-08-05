import type { Metadata } from "next";

import { ServiceInspectionsView } from "@/components/documents/service-inspections-view";
import { requireTagWriter } from "@/lib/auth/require-tag-access";

interface ServicePageProps {
  params: Promise<{ uuid: string }>;
  searchParams: Promise<{ scan?: string }>;
}

export async function generateMetadata({
  params,
}: ServicePageProps): Promise<Metadata> {
  const { uuid } = await params;
  return {
    title: `Service & Wartung · ${uuid}`,
    description: "Inspektionen und Servicebelege für diesen ZeloxTag.",
  };
}

export default async function ServiceInspectionsPage({
  params,
  searchParams,
}: ServicePageProps) {
  const { uuid } = await params;
  const { scan } = await searchParams;
  const { result } = await requireTagWriter(uuid);

  return (
    <ServiceInspectionsView
      tagUuid={result.tag.uuid}
      vehicleId={result.vehicle!.id}
      vehicleLabel={`${result.vehicle!.make} ${result.vehicle!.model} · ${result.vehicle!.year}`}
      documents={result.documents}
      initialScan={scan === "1"}
    />
  );
}
