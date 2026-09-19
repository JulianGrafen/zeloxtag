import { PaywallResaleValueChart } from "@/components/billing/paywall/paywall-resale-value-chart";
import type { PaywallVisualKind } from "@/lib/billing/paywall-personalization";
import { cn } from "@/lib/utils";

const FONT = "var(--font-poppins), system-ui, sans-serif";

function PaywallShowcaseQrVisual({ className }: { className?: string }) {
  const w = 280;
  const h = 132;
  return (
    <div className={cn("px-0 py-0", className)}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="mx-auto block h-auto w-full max-w-[20rem]"
        role="img"
        aria-hidden
      >
        {/* Phone */}
        <rect
          x={88}
          y={18}
          width={52}
          height={96}
          rx={8}
          className="fill-none stroke-[color:var(--paywall-chart-axis)]"
          strokeWidth="1.5"
        />
        <rect
          x={96}
          y={32}
          width={36}
          height={36}
          rx={4}
          className="fill-[color:var(--paywall-chart-muted)]/35 stroke-[color:var(--paywall-chart-muted)]"
          strokeWidth="1.2"
          strokeDasharray="4 3"
        />
        <text
          x={114}
          y={54}
          textAnchor="middle"
          className="fill-[color:var(--paywall-chart-muted-label)] text-[7px] font-medium"
          style={{ fontFamily: FONT }}
        >
          leer
        </text>

        {/* Car silhouette */}
        <path
          d="M 168 88 Q 200 72 238 88 L 248 96 L 248 102 L 160 102 L 160 96 Z"
          className="fill-[color:var(--paywall-chart-muted)]/25 stroke-[color:var(--paywall-chart-muted)]"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* QR on car — Pro */}
        <rect
          x={198}
          y={78}
          width={22}
          height={22}
          rx={3}
          className="fill-[color:var(--paywall-chart-accent)]"
        />
        <text
          x={209}
          y={92}
          textAnchor="middle"
          className="fill-[color:var(--paywall-chart-badge-text)] text-[6px] font-bold"
          style={{ fontFamily: FONT }}
        >
          Pro
        </text>

        <path
          d="M 140 50 L 168 78"
          className="stroke-[color:var(--paywall-chart-accent)]"
          strokeWidth="2"
          strokeDasharray="3 2"
          fill="none"
        />

        <text
          x={140}
          y={108}
          textAnchor="middle"
          className="fill-[color:var(--paywall-chart-muted-label)] text-[9px] font-medium"
          style={{ fontFamily: FONT }}
        >
          Ohne Pro
        </text>
        <text
          x={220}
          y={118}
          textAnchor="middle"
          className="fill-[color:var(--paywall-chart-accent)] text-[9px] font-semibold"
          style={{ fontFamily: FONT }}
        >
          Mit Pro · live
        </text>
      </svg>
    </div>
  );
}

function PaywallVaultGapVisual({ className }: { className?: string }) {
  const w = 280;
  const h = 132;
  return (
    <div className={cn("px-0 py-0", className)}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="mx-auto block h-auto w-full max-w-[20rem]"
        role="img"
        aria-hidden
      >
        {/* Messy stack */}
        <rect
          x={32}
          y={36}
          width={44}
          height={56}
          rx={3}
          transform="rotate(-8 54 64)"
          className="fill-[color:var(--paywall-chart-muted)]/30 stroke-[color:var(--paywall-chart-muted)]"
          strokeWidth="1.2"
        />
        <rect
          x={48}
          y={42}
          width={44}
          height={56}
          rx={3}
          transform="rotate(4 70 70)"
          className="fill-[color:var(--paywall-chart-muted)]/20 stroke-[color:var(--paywall-chart-muted)]"
          strokeWidth="1.2"
        />
        <text
          x={58}
          y={78}
          className="fill-[color:var(--paywall-chart-muted-label)] text-[8px] font-semibold"
          style={{ fontFamily: FONT }}
        >
          ABE?
        </text>

        {/* Gap / missing */}
        <circle
          cx={118}
          cy={68}
          r={14}
          className="fill-none stroke-[color:var(--paywall-chart-muted)]"
          strokeWidth="1.5"
          strokeDasharray="3 2"
        />
        <text
          x={118}
          y={72}
          textAnchor="middle"
          className="fill-[color:var(--paywall-chart-muted-label)] text-[14px] font-bold"
          style={{ fontFamily: FONT }}
        >
          ?
        </text>

        {/* Vault */}
        <rect
          x={148}
          y={28}
          width={100}
          height={76}
          rx={8}
          className="fill-[color:var(--paywall-chart-accent)]/12 stroke-[color:var(--paywall-chart-accent)]"
          strokeWidth="2"
        />
        <rect
          x={162}
          y={44}
          width={72}
          height={10}
          rx={2}
          className="fill-[color:var(--paywall-chart-accent)]/40"
        />
        <rect
          x={162}
          y={60}
          width={72}
          height={10}
          rx={2}
          className="fill-[color:var(--paywall-chart-accent)]/55"
        />
        <rect
          x={162}
          y={76}
          width={72}
          height={10}
          rx={2}
          className="fill-[color:var(--paywall-chart-accent)]"
        />

        <text
          x={72}
          y={112}
          textAnchor="middle"
          className="fill-[color:var(--paywall-chart-muted-label)] text-[9px] font-medium"
          style={{ fontFamily: FONT }}
        >
          Zettelchaos
        </text>
        <text
          x={198}
          y={112}
          textAnchor="middle"
          className="fill-[color:var(--paywall-chart-accent)] text-[9px] font-semibold"
          style={{ fontFamily: FONT }}
        >
          Gutachten-Tresor
        </text>
      </svg>
    </div>
  );
}

export function PaywallGoalVisual({
  kind,
  ariaLabel,
  className,
}: {
  kind: PaywallVisualKind;
  ariaLabel: string;
  compact?: boolean;
  className?: string;
}) {
  if (kind === "resale_chart") {
    return (
      <PaywallResaleValueChart
        className={className}
        ariaLabel={ariaLabel}
      />
    );
  }

  return (
    <figure
      className={cn("px-0 py-0", className)}
      aria-label={ariaLabel}
    >
      {kind === "showcase_qr" ? (
        <PaywallShowcaseQrVisual />
      ) : (
        <PaywallVaultGapVisual />
      )}
    </figure>
  );
}
