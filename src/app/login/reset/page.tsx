import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { PasswordResetRequestForm } from "@/components/auth/password-reset-request-form";

export const metadata: Metadata = {
  title: "Passwort zurücksetzen · ZeloxTag",
  description: "ZeloxTag Passwort per E-Mail zurücksetzen.",
};

interface PasswordResetPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function PasswordResetPage({
  searchParams,
}: PasswordResetPageProps) {
  const { error } = await searchParams;
  const sessionHint =
    error === "session"
      ? "Der Reset-Link ist abgelaufen oder ungültig. Bitte erneut anfordern."
      : null;

  return (
    <AppShell showNavbar={false}>
      <PasswordResetRequestForm initialError={sessionHint} />
    </AppShell>
  );
}
