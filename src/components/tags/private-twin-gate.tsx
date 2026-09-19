import { Lock, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScanContent } from "@/components/layout/scan-content";
import { signOutToLoginForm } from "@/lib/auth/actions";
import type { GarageVehicle } from "@/lib/garage/types";
import { PressableLink } from "@/components/vehicle-dashboard/Pressable";

type PrivateTwinGateProps = {
  tagUuid: string;
  vehicleLabel: string;
  ownerName: string;
  sessionEmail: string | null;
  /** Signed-in user's own vehicles — switch without logout. */
  myGarage?: GarageVehicle[];
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
  myGarage = [],
}: PrivateTwinGateProps) {
  const loginHref = `/login?next=${encodeURIComponent(`/v/${tagUuid}`)}`;
  const ownedElsewhere = myGarage.filter((entry) => entry.tagUuid !== tagUuid);

  return (
    <ScanContent className="pb-12">
      <div className="vd-surface-card p-6">
        <p className="claim-kicker flex items-center gap-2">
          <Lock className="h-3.5 w-3.5" aria-hidden />
          Private Fahrzeugakte
        </p>
        <h1 className="claim-title mt-3">{vehicleLabel}</h1>
        <p className="claim-copy mt-3">
          Rechnungen, Belege, Intervalle und Original-PDFs sind nur für den
          Eigentümer sichtbar. Fremde QR-Scans erhalten keinen Dokumentenzugriff.
        </p>
      </div>

      <div className="vd-tile p-5">
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
            {ownedElsewhere.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[0.82rem] font-medium text-[color:var(--vd-text)]">
                  Zu deinem Fahrzeug wechseln — ohne Abmelden:
                </p>
                <ul className="space-y-2">
                  {ownedElsewhere.map((entry) => (
                    <li key={entry.vehicleId}>
                      <PressableLink
                        href={`/v/${entry.tagUuid}`}
                        variant="button"
                        className="claim-cta w-full justify-center no-underline"
                      >
                        {entry.label}
                        {entry.year != null ? ` · ${entry.year}` : ""}
                      </PressableLink>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <form action={signOutToLoginForm}>
              <input type="hidden" name="next" value={`/v/${tagUuid}`} />
              <Button type="submit" variant={ownedElsewhere.length > 0 ? "outline" : "default"}>
                <LogIn className="h-4 w-4" aria-hidden />
                Mit Eigentümer-Konto anmelden
              </Button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-[0.88rem] leading-relaxed text-[color:var(--vd-muted)]">
              Melde dich mit dem Konto an, das diesen ZeloxTag beansprucht hat.
            </p>
            <PressableLink href={loginHref} variant="button" className="claim-cta">
              <LogIn className="h-4 w-4" aria-hidden />
              Anmelden
            </PressableLink>
          </div>
        )}
      </div>
    </ScanContent>
  );
}
