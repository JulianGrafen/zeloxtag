import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ExposeView } from "@/components/expose/ExposeView";
import { getPublicExposeByToken } from "@/lib/vehicles/get-public-expose";
import { exposeTokenSchema } from "@/lib/vehicles/expose-token";

type ExposePageProps = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata({
  params,
}: ExposePageProps): Promise<Metadata> {
  const { token } = await params;
  const parsed = exposeTokenSchema.safeParse(token.trim());
  if (!parsed.success) {
    return { title: "Exposé · ZeloxTag", robots: { index: false, follow: false } };
  }

  const data = await getPublicExposeByToken(parsed.data);
  if (!data) {
    return { title: "Exposé · ZeloxTag", robots: { index: false, follow: false } };
  }

  return {
    title: `${data.vehicleTitle} · ZeloxTag Verkaufsexposé`,
    description: `Verifiziertes ZeloxTag Fahrzeugdossier – ${data.documentCount} Dokumente fälschungssicher erfasst.`,
    robots: { index: false, follow: false },
  };
}

export default async function ExposePage({ params }: ExposePageProps) {
  const { token } = await params;
  const parsed = exposeTokenSchema.safeParse(token.trim());
  if (!parsed.success) notFound();

  const data = await getPublicExposeByToken(parsed.data);
  if (!data) notFound();

  return <ExposeView data={data} />;
}
