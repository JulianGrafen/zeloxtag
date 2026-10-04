import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { EmailConfirmedPanel } from "@/components/auth/email-confirmed-panel";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/auth/get-user";
import { loginGateHref } from "@/lib/auth/login-gate-url";
import { resolveAuthContinueHref } from "@/lib/auth/resolve-auth-continue-href";

export const metadata: Metadata = {
  title: "E-Mail bestätigt · ZeloxTag",
  description: "Dein ZeloxTag-Konto wurde bestätigt.",
};

export default async function EmailConfirmedPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(loginGateHref("/auth/confirmed"));
  }

  const href = await resolveAuthContinueHref(user.id);
  if (!href.startsWith("/?")) {
    redirect(href);
  }

  return (
    <AppShell showNavbar={false}>
      <EmailConfirmedPanel />
    </AppShell>
  );
}
