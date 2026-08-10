import { Lock } from "lucide-react";

type PublicProfilePrivateProps = {
  vehicleLabel?: string | null;
};

export function PublicProfilePrivate({
  vehicleLabel,
}: PublicProfilePrivateProps) {
  return (
    <section className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pb-12 pt-[max(2rem,env(safe-area-inset-top))] sm:px-5">
      <div className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-6 text-center shadow-[var(--vd-shadow)]">
        <p className="mx-auto flex w-fit items-center gap-2 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
          <Lock className="h-3.5 w-3.5" aria-hidden />
          Privates Profil
        </p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-[1.5rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
          {vehicleLabel ?? "Dieses Fahrzeugprofil ist privat"}
        </h1>
        <p className="mt-3 text-[0.92rem] leading-relaxed text-[color:var(--vd-muted)]">
          Der Halter hat die öffentliche Showcase-Ansicht deaktiviert. Scanne den
          QR-Code in der Motorraum, wenn du eingeladen bist — oder frag den
          Besitzer nach dem Freigabe-Link.
        </p>
      </div>
    </section>
  );
}
