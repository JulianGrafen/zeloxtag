import type { SVGProps } from "react";

type VehicleSilhouetteProps = SVGProps<SVGSVGElement> & {
  /** Soft label for assistive tech */
  label?: string;
};

/**
 * Stilisierte Coupé-Silhouette, falls kein Fahrzeugfoto vorhanden ist.
 * Neutral genug für RX-8 und vergleichbare Sportwagen.
 */
export function VehicleSilhouette({
  label = "Fahrzeug-Silhouette",
  className,
  ...props
}: VehicleSilhouetteProps) {
  return (
    <svg
      viewBox="0 0 320 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={label}
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="bodySheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.95" />
          <stop offset="55%" stopColor="currentColor" stopOpacity="0.55" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.25" />
        </linearGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.08" />
        </linearGradient>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="160" cy="108" rx="118" ry="8" fill="currentColor" opacity="0.12" />

      {/* Body */}
      <path
        d="M28 78c8-6 22-14 38-18 10-18 34-34 58-38 22-4 48-2 68 6 18 8 34 22 42 32 16 2 36 8 48 16 6 4 8 10 4 14-18 4-46 6-78 6H54c-16 0-30-2-34-8-2-4 0-8 8-10z"
        fill="url(#bodySheen)"
      />

      {/* Cabin glass */}
      <path
        d="M108 36c18-8 40-10 58-6 16 4 30 14 38 24H122c-6-8-10-14-14-18z"
        fill="url(#glass)"
      />

      {/* Belt line */}
      <path
        d="M56 64h196"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Wheels */}
      <circle cx="86" cy="86" r="16" fill="currentColor" opacity="0.9" />
      <circle cx="86" cy="86" r="7" fill="currentColor" opacity="0.35" />
      <circle cx="232" cy="86" r="16" fill="currentColor" opacity="0.9" />
      <circle cx="232" cy="86" r="7" fill="currentColor" opacity="0.35" />

      {/* Headlight accent */}
      <path
        d="M268 72c8 2 14 6 18 10"
        stroke="currentColor"
        strokeOpacity="0.55"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
