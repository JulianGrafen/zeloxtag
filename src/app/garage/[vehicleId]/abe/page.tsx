import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { garagePathForVehicle } from "@/lib/vehicle-surface/paths";

interface AbePageProps {
  params: Promise<{ vehicleId: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "ABE & Gutachten · ZeloxTag",
    description: "ABEs und Gutachten für diesen ZeloxTag.",
  };
}

/** Convenience route → ABE / Gutachten-Akte. */
export default async function VehicleAbePage({ params }: AbePageProps) {
  const { vehicleId } = await params;
  redirect(garagePathForVehicle(vehicleId, "dokumente?type=abe"));
}
