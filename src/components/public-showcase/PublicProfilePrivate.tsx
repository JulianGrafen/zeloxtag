import { Lock } from "lucide-react";

import { showroom } from "./showroom-styles";

type PublicProfilePrivateProps = {
  vehicleLabel?: string | null;
};

export function PublicProfilePrivate({
  vehicleLabel,
}: PublicProfilePrivateProps) {
  return (
    <div className={`${showroom.page} flex items-center px-4 py-[max(2rem,env(safe-area-inset-top))]`}>
      <section className="mx-auto w-full max-w-lg">
        <div className={`${showroom.panelFlat} p-6 text-center`}>
          <p
            className={`mx-auto flex w-fit items-center gap-2 ${showroom.kicker}`}
          >
            <Lock className="h-3.5 w-3.5" aria-hidden />
            Privates Profil
          </p>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-[1.5rem] font-semibold tracking-[-0.03em] text-white">
            {vehicleLabel ?? "Dieses Fahrzeugprofil ist privat"}
          </h1>
          <p className={`mt-3 ${showroom.body}`}>
            Der Halter hat die öffentliche Showcase-Ansicht deaktiviert. Scanne den
            QR-Code in der Motorraum, wenn du eingeladen bist — oder frag den
            Besitzer nach dem Freigabe-Link.
          </p>
        </div>
        <footer className={`mt-8 ${showroom.footer}`}>ZeloxTag</footer>
      </section>
    </div>
  );
}
