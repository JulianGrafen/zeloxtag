import type { Metadata } from "next";
import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Profil nicht öffentlich · ZeloxTag",
  description: "Dieses Fahrzeugprofil ist noch nicht über einen ZeloxTag erreichbar.",
};

export default function ProfilNichtVerfuegbarPage() {
  return (
    <AppShell showNavbar={false}>
      <div className="mx-auto max-w-lg px-4 py-12">
        <div className="vd-surface-card p-6 text-center">
          <p className="claim-kicker">Showcase</p>
          <h1 className="claim-title mt-2">Profil noch nicht öffentlich</h1>
          <p className="claim-copy mt-3">
            Die Quartettkarte ist erst verfügbar, wenn ein aktiver V4A-Tag mit
            dem Fahrzeug verknüpft ist.
          </p>
          <Link href="/" className="claim-cta mt-6 inline-flex no-underline">
            Zur Startseite
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
