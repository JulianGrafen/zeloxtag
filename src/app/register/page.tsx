import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { DigitalGarageRegisterView } from "@/components/auth/digital-garage-register-view";
import { pageSocialMetadata } from "@/lib/seo/open-graph";

export const metadata: Metadata = {
  title: "Registrieren · ZeloxTag",
  description:
    "Kostenlose digitale Garage — Konto anlegen, Fahrzeug eintragen, optional später V4A-Tag verknüpfen.",
  ...pageSocialMetadata({
    title: "Registrieren · ZeloxTag",
    description:
      "Kostenlose digitale Garage — Konto anlegen, Fahrzeug eintragen, optional später V4A-Tag verknüpfen.",
    path: "/register",
  }),
};

interface RegisterPageProps {
  searchParams: Promise<{ error?: string }>;
}

function mapRegisterError(error: string | undefined): string | undefined {
  if (!error) return undefined;
  if (error === "rate_limited") {
    return "Zu viele Versuche. Bitte kurz warten und erneut versuchen.";
  }
  return error;
}

/** PWA registration — guided flow like tag claim, then vehicle onboarding. */
export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { error } = await searchParams;

  return (
    <AppShell showNavbar={false}>
      <DigitalGarageRegisterView initialError={mapRegisterError(error)} />
    </AppShell>
  );
}
