import { cn } from "@/lib/utils";

const TRUST_POINTS = [
  "Deutsches/EU-Hosting",
  "DSGVO-konform",
  "Verschlüsselte Fahrzeugakten",
] as const;

type GarageDataTrustBannerProps = {
  className?: string;
};

/** Trust strip for Garage login & registration surfaces. */
export function GarageDataTrustBanner({ className }: GarageDataTrustBannerProps) {
  return (
    <div
      className={cn(
        "zt-feature-panel border border-[color:var(--vd-border)]/80 bg-[color:var(--vd-surface-elevated)]/70 px-4 py-3 shadow-[var(--vd-shadow-sm)]",
        className,
      )}
      role="note"
      aria-label="Datenschutz und Hosting"
    >
      <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[0.78rem] leading-snug text-[color:var(--vd-muted)] sm:justify-start sm:text-left">
        <span className="text-base leading-none" aria-hidden>
          🇩🇪
        </span>
        {TRUST_POINTS.map((point, index) => (
          <span key={point} className="inline-flex items-center gap-2">
            {index > 0 ? (
              <span className="text-[color:var(--vd-border)]" aria-hidden>
                ·
              </span>
            ) : null}
            <span className="text-[color:var(--vd-text)]">{point}</span>
          </span>
        ))}
      </p>
    </div>
  );
}
