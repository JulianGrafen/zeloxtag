import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { VehicleSettingsView } from "@/components/vehicles/vehicle-settings-view";
import { requireTagOwner } from "@/lib/auth/require-tag-access";
import { isDemoActiveTag } from "@/lib/tags/demo-showcase";
import { getOwnerExposeState } from "@/lib/vehicles/get-public-expose";

interface VehicleSettingsPageProps {
  params: Promise<{ uuid: string }>;
}

export async function generateMetadata({
  params,
}: VehicleSettingsPageProps): Promise<Metadata> {
  const { uuid } = await params;
  return {
    title: `Einstellungen · ${uuid}`,
    description: "Öffentlicher Showcase und Verkaufs-Exposé verwalten.",
  };
}

export default async function VehicleSettingsPage({
  params,
}: VehicleSettingsPageProps) {
  const { uuid } = await params;
  const { result } = await requireTagOwner(uuid);
  const vehicle = result.vehicle!;
  const expose = await getOwnerExposeState(vehicle.id);

  return (
    <AppShell showNavbar={false}>
      <section className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-12 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5">
        <Link
          href={`/v/${uuid}`}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Dashboard
        </Link>

        <header className="space-y-2">
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
            Fahrzeug
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-[1.65rem] font-semibold tracking-[-0.035em] text-[color:var(--vd-text)]">
            Einstellungen
          </h1>
          <p className="text-[0.92rem] leading-relaxed text-[color:var(--vd-muted)]">
            {vehicle.make} {vehicle.model}
            {vehicle.year ? ` · ${vehicle.year}` : ""} — öffentliches Profil
            und Verkaufs-Exposé.
          </p>
        </header>

        <VehicleSettingsView
          tagUuid={uuid}
          vehicle={vehicle}
          documents={result.documents}
          canEdit={!isDemoActiveTag(uuid)}
          exposeToken={expose.exposeToken}
          isExposeActive={expose.isExposeActive}
        />
      </section>
    </AppShell>
  );
}
