import { Info } from "lucide-react";

import { VEHICLE_DATA_DISCLAIMER } from "@/lib/legal/vehicle-data-disclaimer";

interface VehicleDataDisclaimerProps {
  className?: string;
}

/**
 * Orientation notice for extracted vehicle documents — not a substitute for
 * original papers or § 19 StVZO acceptance obligations.
 */
export function VehicleDataDisclaimer({
  className = "",
}: VehicleDataDisclaimerProps) {
  return (
    <aside
      role="note"
      aria-label="Rechtlicher Hinweis"
      className={[
        "flex gap-2.5 rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)]/70 px-4 py-3.5 text-[0.78rem] leading-relaxed text-[color:var(--vd-muted)] shadow-[var(--vd-shadow-sm)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Info
        className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--vd-muted)]"
        aria-hidden
      />
      <p className="min-w-0 break-words">
        <span className="font-semibold text-[color:var(--vd-text)]">
          Hinweis:
        </span>{" "}
        {VEHICLE_DATA_DISCLAIMER}
      </p>
    </aside>
  );
}
