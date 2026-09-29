import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CreateGarageVehicleForm } from "@/components/onboarding/create-garage-vehicle-form";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/auth/get-user";
import { userHasGarageVehicle } from "@/lib/auth/user-has-vehicle";
import { resolvePostLoginPath } from "@/lib/auth/post-login-path";

export const metadata: Metadata = {
  title: "Fahrzeug anlegen · ZeloxTag",
  description: "Dein erstes Fahrzeug in der digitalen Garage.",
};

export default async function OnboardingVehiclePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/?next=/onboarding/fahrzeug&tab=signup");
  }

  if (await userHasGarageVehicle(user.id)) {
    const destination = await resolvePostLoginPath(user.id);
    redirect(destination);
  }

  return (
    <AppShell showNavbar={false}>
      <CreateGarageVehicleForm />
    </AppShell>
  );
}
