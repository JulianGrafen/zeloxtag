import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Anmelden · ZeloxTag",
  description:
    "Bei ZeloxTag anmelden — digitale Fahrzeugakte nach QR-Scan.",
};

interface HomePageProps {
  searchParams: Promise<{ next?: string; error?: string; recovered?: string }>;
}

/**
 * Production landing: login / signup (replaces the public RX-8 demo dashboard).
 */
function mapLoginQueryError(error: string | undefined): string | undefined {
  if (!error) return undefined;
  if (error === "rate_limited") {
    return "Zu viele Versuche. Bitte kurz warten und erneut anmelden.";
  }
  return error;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { next, error, recovered } = await searchParams;

  return (
    <AppShell showNavbar={false}>
      <LoginForm
        nextPath={next && next !== "/" ? next : "/auth/continue"}
        initialError={mapLoginQueryError(error)}
        recovered={recovered === "1"}
      />
    </AppShell>
  );
}
