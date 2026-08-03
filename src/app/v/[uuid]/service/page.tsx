import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ServiceInspectionsView } from "@/components/documents/service-inspections-view";
import { getTagByUuid } from "@/lib/tags/get-tag-by-uuid";

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
  const result = await getTagByUuid(uuid);

  if (!result?.vehicle || result.tag.status !== "active") {
    notFound();
  }

  return (
    <ServiceInspectionsView
      tagUuid={result.tag.uuid}
      vehicleId={result.vehicle.id}
      vehicleLabel={`${result.vehicle.make} ${result.vehicle.model} · ${result.vehicle.year}`}
      documents={result.documents}
      initialScan={scan === "1"}
    />
  );
}
