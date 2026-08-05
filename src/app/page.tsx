import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Anmelden · ZeloxTag",
  description:
    "Bei ZeloxTag anmelden — digitale Fahrzeugakte nach QR-Scan.",
};

interface HomePageProps {
  searchParams: Promise<{ next?: string; error?: string }>;
}

/**
 * Production landing: login / signup (replaces the public RX-8 demo dashboard).
 */
export default async function HomePage({ searchParams }: HomePageProps) {
  const { next, error } = await searchParams;

  return (
    <AppShell showNavbar={false}>
      <LoginForm
        nextPath={next && next !== "/" ? next : "/auth/continue"}
        initialError={error}
      />
    </AppShell>
  );
}
