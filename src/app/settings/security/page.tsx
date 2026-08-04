import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Sicherheit · ZeloxTag",
  description: "MFA und Konto-Sicherheit verwalten.",
};

/** Legacy deep link — 2FA lives under Einstellungen. */
export default function SecuritySettingsRedirectPage() {
  redirect("/settings");
}
