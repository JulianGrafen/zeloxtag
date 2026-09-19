import { cn } from "@/lib/utils";

const VIEW_W = 280;
const VIEW_H = 132;
const PLOT = { left: 28, right: 268, top: 18, bottom: 96 };

/** Speak-style comparison: flat “Ohne” vs rising “ZeloxTag” toward resale. */
export function PaywallResaleValueChart({
  className,
  ariaLabel = "Fahrzeugwert beim Verkauf: mit ZeloxTag höher als ohne Dokumentation",
}: {
  compact?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const x0 = PLOT.left;
  const x1 = PLOT.right;
  const yBase = PLOT.bottom;

  const ohnePath = `M ${x0} ${yBase - 4} Q ${(x0 + x1) / 2} ${yBase - 10} ${x1} ${yBase - 14}`;
  const zeloxPath = `M ${x0} ${yBase - 4} C ${x0 + 52} ${yBase - 2}, ${x0 + 120} ${PLOT.top + 38}, ${x1} ${PLOT.top + 8}`;

  return (
    <figure
      className={cn("px-0 py-0", className)}
      aria-label={ariaLabel}
    >
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="mx-auto block h-auto w-full max-w-[20rem]"
        role="img"
        aria-hidden
      >
        <text
          x={10}
          y={(PLOT.top + PLOT.bottom) / 2}
          textAnchor="middle"
          transform={`rotate(-90, 10, ${(PLOT.top + PLOT.bottom) / 2})`}
          className="fill-[color:var(--paywall-chart-muted-label)] text-[9px] font-medium"
          style={{ fontFamily: "var(--font-poppins), system-ui, sans-serif" }}
        >
          Fahrzeugwert
        </text>

        {/* Y axis */}
        <line
          x1={PLOT.left}
          y1={PLOT.top}
          x2={PLOT.left}
          y2={PLOT.bottom}
          className="stroke-[color:var(--paywall-chart-axis)]"
          strokeWidth="1.5"
        />
        {/* X axis */}
        <line
          x1={PLOT.left}
          y1={PLOT.bottom}
          x2={PLOT.right}
          y2={PLOT.bottom}
          className="stroke-[color:var(--paywall-chart-axis)]"
          strokeWidth="1.5"
        />

        <path
          d={ohnePath}
          fill="none"
          className="stroke-[color:var(--paywall-chart-muted)]"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d={zeloxPath}
          fill="none"
          className="stroke-[color:var(--paywall-chart-accent)]"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* End markers */}
        <circle
          cx={x1}
          cy={yBase - 14}
          r="3"
          className="fill-[color:var(--paywall-chart-muted)]"
        />
        <circle
          cx={x1}
          cy={PLOT.top + 8}
          r="4"
          className="fill-[color:var(--paywall-chart-accent)]"
        />

        {/* Stat badge */}
        <circle
          cx={92}
          cy={42}
          r="26"
          className="fill-[color:var(--paywall-chart-accent)]"
        />
        <text
          x={92}
          y={46}
          textAnchor="middle"
          className="fill-[color:var(--paywall-chart-badge-text)] text-[11px] font-bold"
          style={{ fontFamily: "var(--font-poppins), system-ui, sans-serif" }}
        >
          +10–20%
        </text>

        <text
          x={x1 - 4}
          y={PLOT.top + 2}
          textAnchor="end"
          className="fill-[color:var(--paywall-chart-accent)] text-[10px] font-semibold"
          style={{ fontFamily: "var(--font-poppins), system-ui, sans-serif" }}
        >
          ZeloxTag
        </text>
        <text
          x={x1 - 4}
          y={yBase - 18}
          textAnchor="end"
          className="fill-[color:var(--paywall-chart-muted-label)] text-[9px] font-medium"
          style={{ fontFamily: "var(--font-poppins), system-ui, sans-serif" }}
        >
          Ohne
        </text>

      </svg>
    </figure>
  );
}
