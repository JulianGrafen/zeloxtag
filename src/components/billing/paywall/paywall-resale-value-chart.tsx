import { cn } from "@/lib/utils";

const VIEW_W = 280;
const VIEW_H = 108;
const PLOT = { left: 24, right: 256, top: 8, bottom: 78 };

const BAR_WIDTH = 52;
const BAR_RX = 8;
const OHNE_HEIGHT = 26;
const DOCS_HEIGHT = 58;

/**
 * Ruhiger Vergleich: dokumentierter vs. lückenhafter Werthalt — Balkendiagramm.
 */
export function PaywallResaleValueChart({
  className,
  ariaLabel = "Fahrzeugwert beim Verkauf: mit lückenloser Dokumentation höher als ohne Belege",
}: {
  compact?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const yBase = PLOT.bottom;
  const ohneX = 72 - BAR_WIDTH / 2;
  const docsX = 208 - BAR_WIDTH / 2;
  const ohneY = yBase - OHNE_HEIGHT;
  const docsY = yBase - DOCS_HEIGHT;

  return (
    <figure className={cn("px-1 py-2", className)} aria-label={ariaLabel}>
      <p className="mx-auto mb-1.5 max-w-[18rem] text-left text-[11px] font-medium tracking-[-0.01em] text-[color:var(--vd-muted)]">
        Fahrzeugwert
      </p>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="mx-auto block h-auto w-full max-w-[18rem]"
        role="img"
        aria-hidden
      >
        <line
          x1={PLOT.left}
          y1={yBase}
          x2={PLOT.right}
          y2={yBase}
          className="stroke-[color:var(--paywall-chart-axis)]"
          strokeWidth="1"
        />

        <rect
          x={ohneX}
          y={ohneY}
          width={BAR_WIDTH}
          height={OHNE_HEIGHT}
          rx={BAR_RX}
          className="fill-[color:var(--paywall-chart-muted)] opacity-[0.35]"
        />
        <rect
          x={docsX}
          y={docsY}
          width={BAR_WIDTH}
          height={DOCS_HEIGHT}
          rx={BAR_RX}
          className="fill-[color:var(--paywall-chart-accent)] opacity-90"
        />
      </svg>

      <figcaption className="mx-auto mt-2 flex max-w-[18rem] items-center justify-center gap-5 text-[11px] leading-none text-[color:var(--vd-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-[3px] bg-[color:var(--paywall-chart-muted)] opacity-[0.35]"
            aria-hidden
          />
          Ohne Akte
        </span>
        <span className="inline-flex items-center gap-1.5 font-medium text-[color:var(--vd-text)]">
          <span
            className="inline-block h-2.5 w-2.5 rounded-[3px] bg-[color:var(--paywall-chart-accent)]"
            aria-hidden
          />
          Lückenlos dokumentiert
        </span>
      </figcaption>
    </figure>
  );
}
