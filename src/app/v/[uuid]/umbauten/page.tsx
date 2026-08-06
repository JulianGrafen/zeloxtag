import type { Metadata } from "next";

import { ManualEntryView } from "@/components/documents/manual-entry-view";
import { requireTagWriter } from "@/lib/auth/require-tag-access";

interface UmbautenPageProps {
  params: Promise<{ uuid: string }>;
}

export async function generateMetadata({
  params,
}: UmbautenPageProps): Promise<Metadata> {
  const { uuid } = await params;
  return {
    title: `Umbauten · ${uuid}`,
    description: "Umbau- und Tuning-Historie mit Fotos durchsuchen.",
  };
}

export default async function UmbautenPage({ params }: UmbautenPageProps) {
  const { uuid } = await params;
  const { result, access } = await requireTagWriter(uuid);
  const documents =
    access.isContributor && !access.isOwner
      ? result.documents.filter((doc) => doc.type === "invoice")
      : result.documents;

  return (
    <ManualEntryView
      tagUuid={result.tag.uuid}
      vehicleId={result.vehicle!.id}
      vehicleLabel={`${result.vehicle!.make} ${result.vehicle!.model} · ${result.vehicle!.year}`}
      documents={documents}
      variant="umbau"
      heading="Umbau-Bilder"
      subheading="Fotos von Tuning & Umbauten"
    />
  );
}
