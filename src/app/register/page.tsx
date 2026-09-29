import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { ClaimFlow } from "@/components/tags/claim-flow";
import { getCurrentUser } from "@/lib/auth/get-user";
import { ownerDisplayNameFromMetadata } from "@/lib/auth/owner-display-name";
import { resolvePostLoginPath } from "@/lib/auth/post-login-path";
import { DigitalGarageBetaClosed } from "@/components/onboarding/digital-garage-beta-closed";
import { userHasGarageVehicle } from "@/lib/auth/user-has-vehicle";
import {
  getDigitalGarageBetaStatus,
  isDigitalGarageBetaClosed,
} from "@/lib/onboarding/digital-garage-beta";
import { pageSocialMetadata } from "@/lib/seo/open-graph";

export const metadata: Metadata = {
  title: "Registrieren · ZeloxTag",
  description:
    "Digitale Garage anlegen — gleicher Ablauf wie nach dem Tag-Scan: Fahrzeug, Tech-Daten, Konto, Dashboard.",
  ...pageSocialMetadata({
    title: "Registrieren · ZeloxTag",
    description:
      "Digitale Garage anlegen — gleicher Ablauf wie nach dem Tag-Scan: Fahrzeug, Tech-Daten, Konto, Dashboard.",
    path: "/register",
  }),
};

/** PWA registration — full claim wizard without a physical tag. */
export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user && (await userHasGarageVehicle(user.id))) {
    redirect(await resolvePostLoginPath(user.id));
  }

  const beta = await getDigitalGarageBetaStatus();
  if (isDigitalGarageBetaClosed(beta)) {
    return <DigitalGarageBetaClosed maxSlots={beta.maxSlots} />;
  }

  return (
    <AppShell showNavbar={false}>
      <ClaimFlow
        variant="digital"
        isAuthenticated={Boolean(user)}
        userEmail={user?.email ?? null}
        initialDisplayName={ownerDisplayNameFromMetadata(user)}
      />
    </AppShell>
  );
}
