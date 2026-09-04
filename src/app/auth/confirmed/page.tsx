import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { EmailConfirmedPanel } from "@/components/auth/email-confirmed-panel";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/auth/get-user";
import { resolveAuthenticatedDestination } from "@/lib/auth/resolve-authenticated-destination";

export const metadata: Metadata = {
  title: "E-Mail bestätigt · ZeloxTag",
  description: "Dein ZeloxTag-Konto wurde bestätigt.",
};

export default async function EmailConfirmedPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?error=session&next=/auth/confirmed");
  }

  const destination = await resolveAuthenticatedDestination(user.id);
  if (destination.status === "error") {
    redirect(`/login?error=${encodeURIComponent(destination.message)}`);
  }

  return (
    <AppShell showNavbar={false}>
      <EmailConfirmedPanel dashboardHref={destination.href} />
    </AppShell>
  );
}
