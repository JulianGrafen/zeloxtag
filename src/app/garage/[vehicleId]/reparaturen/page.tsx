import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { garagePathForVehicle } from "@/lib/vehicle-surface/paths";

interface ReparaturenPageProps {
  params: Promise<{ vehicleId: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Reparaturen · ZeloxTag",
    description: "Reparatur-Belege suchen und filtern.",
  };
}

/** Convenience route → Belege mit Kategorie Reparatur. */
export default async function ReparaturenPage({ params }: ReparaturenPageProps) {
  const { vehicleId } = await params;
  redirect(
    garagePathForVehicle(vehicleId, "dokumente?type=invoice&category=repair"),
  );
}
