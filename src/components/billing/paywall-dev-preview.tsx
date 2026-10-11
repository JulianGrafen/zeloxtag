"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { ProPaywallModal } from "@/components/billing/pro-paywall-modal";
import { ProPaywallSection } from "@/components/billing/pro-paywall-section";
import {
  getPaywallPersonalization,
  formatPaywallVehicleLabel,
} from "@/lib/billing/paywall-personalization";
import type { ZeloxPrimaryGoal } from "@/lib/onboarding/primary-goal";
import {
  FEATURE,
  type PaywallVariant,
} from "@/lib/permissions/feature-access";
import { cn } from "@/lib/utils";

const PREVIEW_TAG = "demo-active-tag";
const PREVIEW_VEHICLE = formatPaywallVehicleLabel("Toyota", "GR Supra", 2022);

const GOALS: { id: ZeloxPrimaryGoal; label: string }[] = [
  { id: "werterhalt", label: "Werterhalt" },
  { id: "showcase", label: "Showcase" },
  { id: "documents", label: "Akte" },
];

const VARIANTS: { id: PaywallVariant; label: string }[] = [
  { id: "default", label: "Standard" },
  { id: "free_scan_exhausted", label: "Gratis-Scan weg" },
];

function parseGoal(raw: string | null): ZeloxPrimaryGoal {
  if (raw === "showcase" || raw === "documents" || raw === "werterhalt") {
    return raw;
  }
  return "werterhalt";
}

function parseVariant(raw: string | null): PaywallVariant {
  return raw === "free_scan_exhausted" ? "free_scan_exhausted" : "default";
}

export function PaywallDevPreview() {
  const searchParams = useSearchParams();
  const initialGoal = parseGoal(searchParams.get("goal"));
  const initialVariant = parseVariant(searchParams.get("variant"));

  const [goal, setGoal] = useState<ZeloxPrimaryGoal>(initialGoal);
  const [variant, setVariant] = useState<PaywallVariant>(initialVariant);
  const [modalOpen, setModalOpen] = useState(true);

  const preview = useMemo(
    () =>
      getPaywallPersonalization({
        goal,
        variant,
        vehicleLabel: PREVIEW_VEHICLE,
      }),
    [goal, variant],
  );

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-10">
      <header className="space-y-3">
        <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
          Dev Preview
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-[1.5rem] font-semibold tracking-[-0.03em]">
          Paywall Vorschau
        </h1>
        <p className="text-[0.85rem] text-[color:var(--vd-muted)]">
          Ziel und Variante wählen. Modal unten. Nur lokal (
          <code className="text-[0.8rem]">/dev/paywall</code>
          ).
        </p>

        <div className="flex flex-wrap gap-2">
          {GOALS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setGoal(item.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[0.78rem] font-medium transition-colors",
                goal === item.id
                  ? "border-[color:var(--vd-text)] bg-[color:var(--vd-text)] text-[color:var(--vd-bg)]"
                  : "border-[color:var(--vd-border)] text-[color:var(--vd-muted)]",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {VARIANTS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setVariant(item.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[0.78rem] font-medium transition-colors",
                variant === item.id
                  ? "border-amber-500/50 bg-amber-500/15 text-amber-200"
                  : "border-[color:var(--vd-border)] text-[color:var(--vd-muted)]",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <p className="rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.8rem] leading-snug text-[color:var(--vd-muted)]">
          <span className="font-medium text-[color:var(--vd-text)]">
            {preview.headline}
          </span>
        </p>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="claim-cta-sm"
        >
          Modal öffnen
        </button>
      </header>

      <ProPaywallSection
        successPath={`/v/${PREVIEW_TAG}`}
        cancelPath={`/v/${PREVIEW_TAG}/abo`}
        dismissHref={`/v/${PREVIEW_TAG}`}
        vehicleLabel={PREVIEW_VEHICLE}
      />

      <ProPaywallModal
        open={modalOpen}
        feature={FEATURE.SCAN_AI_RECEIPT}
        variant={variant}
        triggerContext={{
          goalOverride: goal,
          vehicleLabel: PREVIEW_VEHICLE,
        }}
        tagUuid={PREVIEW_TAG}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
