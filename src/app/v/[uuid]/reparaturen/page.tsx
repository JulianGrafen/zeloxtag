import type { Metadata } from "next";
import { redirect } from "next/navigation";

interface ReparaturenPageProps {
  params: Promise<{ uuid: string }>;
}

export async function generateMetadata({
  params,
}: ReparaturenPageProps): Promise<Metadata> {
  const { uuid } = await params;
  return {
    title: `Reparaturen · ${uuid}`,
    description: "Reparatur-Belege suchen und filtern.",
  };
}

/** Convenience route → Belege mit Kategorie Reparatur. */
export default async function ReparaturenPage({ params }: ReparaturenPageProps) {
  const { uuid } = await params;
  redirect(`/v/${uuid}/dokumente?type=invoice&category=repair`);
}
