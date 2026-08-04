import Link from "next/link";
import { Lock, LogIn } from "lucide-react";

import { signOutToLoginForm } from "@/lib/auth/actions";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";

type PrivateTwinGateProps = {
  tagUuid: string;
  vehicleLabel: string;
  ownerName: string;
  sessionEmail: string | null;
};

/**
 * Locked QR landing for guests / foreign accounts.
 * No invoices, ABE PDFs, VIN, or document tiles.
 */
export function PrivateTwinGate({
  tagUuid,
  vehicleLabel,
  ownerName,
  sessionEmail,
}: PrivateTwinGateProps) {
  const loginHref = `/login?next=${encodeURIComponent(`/v/${tagUuid}`)}`;

  return (
    <section className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-12 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-5">
      <div className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-6 shadow-[var(--vd-shadow)]">
        <p className="flex items-center gap-2 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
          <Lock className="h-3.5 w-3.5" aria-hidden />
          Private Fahrzeugakte
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-[1.65rem] font-semibold tracking-[-0.035em] text-[color:var(--vd-text)]">
          {vehicleLabel}
        </h1>
        <p className="mt-3 text-[0.92rem] leading-relaxed text-[color:var(--vd-muted)]">
          Rechnungen, Belege, Intervalle und Original-PDFs sind nur für den
          Eigentümer sichtbar. Fremde QR-Scans erhalten keinen Dokumentenzugriff.
        </p>
      </div>

      <div className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow-sm)]">
        {sessionEmail ? (
          <div className="space-y-4">
            <p className="text-[0.88rem] leading-relaxed text-[color:var(--vd-muted)]">
              Angemeldet als{" "}
              <span className="font-semibold text-[color:var(--vd-text)]">
                {sessionEmail}
              </span>
              . Dieses Fahrzeug gehört zu{" "}
              <span className="font-semibold text-[color:var(--vd-text)]">
                {ownerName}
              </span>
              .
            </p>
            <form action={signOutToLoginForm}>
              <input type="hidden" name="next" value={`/v/${tagUuid}`} />
              <PressableButton
                type="submit"
                variant="button"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-4 py-3.5 text-[0.88rem] font-semibold text-white"
              >
                <LogIn className="h-4 w-4" aria-hidden />
                Mit Eigentümer-Konto anmelden
              </PressableButton>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-[0.88rem] leading-relaxed text-[color:var(--vd-muted)]">
              Melde dich mit dem Konto an, das diesen ZeloxTag beansprucht hat.
            </p>
            <Link
              href={loginHref}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-4 py-3.5 text-[0.88rem] font-semibold text-white transition-transform active:scale-[0.98]"
            >
              <LogIn className="h-4 w-4" aria-hidden />
              Anmelden
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
