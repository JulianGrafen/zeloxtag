import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { ScanContent } from "@/components/layout/scan-content";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { NetworkMockQr } from "@/components/qr/network-mock-qr";
import { OperatorAccessDenied } from "@/components/qr/operator-access-denied";
import { getCurrentUser } from "@/lib/auth/get-user";
import { requireOperator } from "@/lib/auth/require-operator";

export const metadata: Metadata = {
  title: "ZeloxTag · Tag minten",
  description:
    "Superuser-Minter: unclaimed ZeloxTags erzeugen und als SVG für die Lasergravur herunterladen.",
};

export default async function QrPage() {
  const user = await getCurrentUser();
  const operator = await requireOperator();
  if (!operator.ok) {
    if (operator.status === 401) {
      redirect("/login?next=/qr");
    }
    return (
      <OperatorAccessDenied code={operator.code} userEmail={user?.email} />
    );
  }

  return (
    <AppShell showNavbar={false}>
      <ScanContent className="gap-6 pb-12 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <header className="space-y-2">
          <p className="claim-kicker">ZeloxTag · Superuser</p>
          <h1 className="claim-title">Tag minten</h1>
          <p className="claim-copy text-[0.9rem]">
            Erzeugt echte unclaimed Tags und SVG-QR-Codes für die
            Edelstahl-Plaques. Nur Operator-Accounts mit MFA.
          </p>
        </header>

        <NetworkMockQr />

        <SignOutButton />

        <div className="flex flex-col gap-2 text-center text-[0.82rem]">
          <Link
            href="/"
            className="font-medium text-[color:var(--vd-muted)] underline-offset-2 hover:underline"
          >
            Zur Startseite
          </Link>
          <p className="text-[color:var(--vd-muted)]">
            Seite:{" "}
            <span className="font-mono text-[color:var(--vd-text)]">/qr</span>
          </p>
        </div>
      </ScanContent>
    </AppShell>
  );
}
