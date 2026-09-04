import { Check, Mail, Shield } from "lucide-react";

import {
  PRO_PAYWALL_TRIAL_TIMELINE,
  type ProPaywallTimelineIcon,
} from "@/lib/billing/pro-plan";

function TimelineIcon({ icon }: { icon: ProPaywallTimelineIcon }) {
  switch (icon) {
    case "check":
      return <Check className="h-3.5 w-3.5" strokeWidth={2.5} />;
    case "mail":
      return <Mail className="h-3.5 w-3.5" strokeWidth={2.5} />;
    case "shield":
      return <Shield className="h-3.5 w-3.5" strokeWidth={2.5} />;
  }
}

export function TrialTimeline({
  nodes = PRO_PAYWALL_TRIAL_TIMELINE,
}: {
  nodes?: readonly { icon: ProPaywallTimelineIcon; text: string }[];
}) {
  return (
    <div className="mt-6" aria-label="Testphase-Ablauf">
      <ol className="relative space-y-0">
        {nodes.map((node, index) => (
          <li key={node.text} className="relative flex gap-3 pb-5 last:pb-0">
            {index < nodes.length - 1 ? (
              <span
                className="absolute top-7 left-[0.6875rem] h-[calc(100%-1.25rem)] w-px bg-[color:var(--vd-border)]"
                aria-hidden
              />
            ) : null}
            <span
              className="relative z-10 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] text-[color:var(--vd-text)]"
              aria-hidden
            >
              <TimelineIcon icon={node.icon} />
            </span>
            <span className="pt-0.5 text-[0.82rem] leading-snug text-[color:var(--vd-text)]">
              {node.text}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
