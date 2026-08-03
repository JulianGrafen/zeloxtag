import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { MfaVerifyForm } from "@/components/auth/mfa-verify-form";

export const metadata: Metadata = {
  title: "MFA · ZeloxTag",
  description: "Zwei-Faktor-Authentifizierung abschließen.",
};

interface MfaPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function MfaLoginPage({ searchParams }: MfaPageProps) {
  const { next } = await searchParams;

  return (
    <AppShell>
      <MfaVerifyForm nextPath={next ?? "/dashboard"} />
    </AppShell>
  );
}
