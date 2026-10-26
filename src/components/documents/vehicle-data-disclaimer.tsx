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
        "flex gap-2 px-4 text-xs leading-relaxed text-[color:var(--vd-muted)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Info
        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--vd-muted)]"
        aria-hidden
      />
      <p className="min-w-0 break-words">
        <span className="font-medium">
          Hinweis:
        </span>{" "}
        {VEHICLE_DATA_DISCLAIMER}
      </p>
    </aside>
  );
}
