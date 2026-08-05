import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/get-user";
import { AppShell } from "@/components/layout/app-shell";
import { PasswordUpdateForm } from "@/components/auth/password-update-form";

export const metadata: Metadata = {
  title: "Neues Passwort · ZeloxTag",
  description: "Neues ZeloxTag-Passwort festlegen.",
};

export default async function UpdatePasswordPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login/reset?error=session");
  }

  return (
    <AppShell showNavbar={false}>
      <PasswordUpdateForm />
    </AppShell>
  );
}
