import type { Metadata } from "next";

import { ServiceInspectionsView } from "@/components/documents/service-inspections-view";
import { requireTagWriter } from "@/lib/auth/require-tag-access";

interface ServicePageProps {
  params: Promise<{ uuid: string }>;
  searchParams: Promise<{ scan?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Service & Wartung · ZeloxTag",
    description: "Inspektionen und Servicebelege für diesen ZeloxTag.",
  };
}

export default async function ServiceInspectionsPage({
  params,
  searchParams,
}: ServicePageProps) {
  const { uuid } = await params;
  const { scan } = await searchParams;
  const { result, access } = await requireTagWriter(uuid);
  const documents =
    access.isContributor && !access.isOwner
      ? result.documents.filter((doc) => doc.type === "invoice")
      : result.documents;

  return (
    <ServiceInspectionsView
      tagUuid={result.tag.uuid}
      vehicleId={result.vehicle!.id}
      vehicleLabel={`${result.vehicle!.make} ${result.vehicle!.model} · ${result.vehicle!.year}`}
      documents={documents}
      initialScan={scan === "1"}
    />
  );
}
