import type { Metadata } from "next";
import { redirect } from "next/navigation";

interface AbePageProps {
  params: Promise<{ uuid: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "ABE & Gutachten · ZeloxTag",
    description: "ABEs und Gutachten für diesen ZeloxTag.",
  };
}

/** Convenience route → ABE / Gutachten-Akte. */
export default async function VehicleAbePage({ params }: AbePageProps) {
  const { uuid } = await params;
  redirect(`/v/${uuid}/dokumente?type=abe`);
}
