import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ClaimFlow } from "@/components/tags/claim-flow";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/auth/get-user";
import { ownerDisplayNameFromMetadata } from "@/lib/auth/owner-display-name";
import { userHasGarageVehicle } from "@/lib/auth/user-has-vehicle";
import { resolvePostLoginPath } from "@/lib/auth/post-login-path";

export const metadata: Metadata = {
  title: "Fahrzeug anlegen · ZeloxTag",
  description: "Dein erstes Fahrzeug in der digitalen Garage.",
};

export default async function OnboardingVehiclePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/register");
  }

  if (await userHasGarageVehicle(user.id)) {
    const destination = await resolvePostLoginPath(user.id);
    redirect(destination);
  }

  return (
    <AppShell showNavbar={false}>
      <ClaimFlow
        variant="digital"
        isAuthenticated
        userEmail={user.email ?? null}
        initialDisplayName={ownerDisplayNameFromMetadata(user)}
      />
    </AppShell>
  );
}
