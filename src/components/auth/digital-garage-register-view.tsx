import Link from "next/link";
import { Check } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { ClaimShell } from "@/components/tags/claim/ClaimShell";
import {
  DIGITAL_GARAGE_REGISTER_HEADLINE,
  DIGITAL_GARAGE_REGISTER_LEAD,
  DIGITAL_GARAGE_REGISTER_STEPS,
} from "@/lib/onboarding/digital-garage-register-copy";

const ONBOARDING_NEXT = "/onboarding/fahrzeug";

interface DigitalGarageRegisterViewProps {
  initialError?: string;
}

export function DigitalGarageRegisterView({
  initialError,
}: DigitalGarageRegisterViewProps) {
  return (
    <ClaimShell intro>
      <div className="space-y-6">
        <div className="space-y-3 text-center sm:text-left">
          <p className="claim-kicker">ZeloxTag</p>
          <h1 className="claim-title text-balance">{DIGITAL_GARAGE_REGISTER_HEADLINE}</h1>
          <p className="claim-copy text-[0.92rem] leading-relaxed">
            {DIGITAL_GARAGE_REGISTER_LEAD}
          </p>
        </div>

        <ol className="zt-feature-panel grid gap-2 p-4">
          {DIGITAL_GARAGE_REGISTER_STEPS.map((step, index) => (
            <li
              key={step}
              className="flex items-start gap-3 text-[0.85rem] text-[color:var(--vd-muted)]"
            >
              <span
                className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--vd-text)]/10 text-[0.7rem] font-semibold text-[color:var(--vd-text)]"
                aria-hidden
              >
                {index + 1}
              </span>
              <span className="text-[color:var(--vd-text)]">{step}</span>
            </li>
          ))}
        </ol>

        <LoginForm
          nextPath={ONBOARDING_NEXT}
          initialError={initialError}
          initialTab="signup"
          mode="digitalGarage"
          lockTab="signup"
        />

        <p className="text-center text-[0.82rem] text-[color:var(--vd-muted)]">
          Bereits ein Konto?{" "}
          <Link
            href={`/login?next=${encodeURIComponent(ONBOARDING_NEXT)}`}
            className="font-medium text-[color:var(--vd-text)] underline-offset-4 hover:underline"
          >
            Anmelden
          </Link>
          {" · "}
          <span className="inline-flex items-center gap-1">
            <Check className="size-3.5 opacity-60" aria-hidden />
            Tag am Auto? QR scannen statt registrieren.
          </span>
        </p>
      </div>
    </ClaimShell>
  );
}
