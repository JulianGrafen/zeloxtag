import { cn } from "@/lib/utils";

const VIEW_W = 280;
const VIEW_H = 100;
const PLOT = { left: 8, right: 272, top: 12, bottom: 72 };

/**
 * Ruhiger Vergleich: dokumentierter vs. lückenhafter Werthalt — ohne Badge oder Achsen-Deko.
 */
export function PaywallResaleValueChart({
  className,
  ariaLabel = "Fahrzeugwert beim Verkauf: mit lückenloser Dokumentation höher als ohne Belege",
}: {
  compact?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const x0 = PLOT.left;
  const x1 = PLOT.right;
  const yBase = PLOT.bottom;

  const ohnePath = `M ${x0} ${yBase - 6} L ${x1} ${yBase - 10}`;
  const zeloxPath = `M ${x0} ${yBase - 6} C ${x0 + 70} ${yBase - 8}, ${x0 + 150} ${PLOT.top + 28}, ${x1} ${PLOT.top + 14}`;
  const zeloxArea = `${zeloxPath} L ${x1} ${yBase} L ${x0} ${yBase} Z`;

  return (
    <figure className={cn("px-1 py-2", className)} aria-label={ariaLabel}>
      <p
        className="mx-auto mb-1.5 max-w-[18rem] text-left text-[11px] font-medium tracking-[-0.01em] text-[color:var(--vd-muted)]"
      >
        Fahrzeugwert
      </p>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="mx-auto block h-auto w-full max-w-[18rem]"
        role="img"
        aria-hidden
      >
        <line
          x1={x0}
          y1={yBase}
          x2={x1}
          y2={yBase}
          className="stroke-[color:var(--paywall-chart-axis)]"
          strokeWidth="1"
        />

        <path
          d={zeloxArea}
          className="fill-[color:var(--paywall-chart-accent)] opacity-[0.08]"
        />

        <path
          d={ohnePath}
          fill="none"
          className="stroke-[color:var(--paywall-chart-muted)]"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="4 3"
        />
        <path
          d={zeloxPath}
          fill="none"
          className="stroke-[color:var(--paywall-chart-accent)]"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

      <figcaption
        className="mx-auto mt-2 flex max-w-[18rem] items-center justify-center gap-5 text-[11px] leading-none text-[color:var(--vd-muted)]"
      >
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-px w-4 border-t border-dashed border-[color:var(--paywall-chart-muted)]"
            aria-hidden
          />
          Ohne Akte
        </span>
        <span className="inline-flex items-center gap-1.5 font-medium text-[color:var(--vd-text)]">
          <span
            className="inline-block h-0.5 w-4 rounded-full bg-[color:var(--paywall-chart-accent)]"
            aria-hidden
          />
          Lückenlos dokumentiert
        </span>
      </figcaption>
    </figure>
  );
}
