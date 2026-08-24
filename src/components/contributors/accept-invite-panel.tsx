"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Wrench } from "lucide-react";

import { acceptSchrauberInvite } from "@/actions/vehicle-contributors";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";

type AcceptInvitePanelProps = {
  token: string;
  vehicleLabel: string;
  label: string | null;
  tagUuid: string;
  expired: boolean;
  alreadyActive: boolean;
  isAuthenticated: boolean;
  loginHref: string;
};

export function AcceptInvitePanel({
  token,
  vehicleLabel,
  label,
  tagUuid,
  expired,
  alreadyActive,
  isAuthenticated,
  loginHref,
}: AcceptInvitePanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (expired) {
    return (
      <p className="text-[0.92rem] text-[color:var(--vd-muted)]">
        Diese Einladung ist abgelaufen. Bitte den Eigentümer um einen neuen
        Link bitten.
      </p>
    );
  }

  if (alreadyActive) {
    return (
      <PressableButton
        type="button"
        variant="button"
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-4 py-3.5 text-[0.88rem] font-semibold text-white"
        onClick={() => router.push(`/v/${tagUuid}`)}
      >
        Zum Fahrzeug
      </PressableButton>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="space-y-3">
        <p className="text-[0.88rem] leading-relaxed text-[color:var(--vd-muted)]">
          Melde dich an oder erstelle ein Konto, um als Schrauber Reparaturen
          für {vehicleLabel} einzutragen.
        </p>
        <a
          href={loginHref}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-4 py-3.5 text-[0.88rem] font-semibold text-white"
        >
          Anmelden / Registrieren
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[0.88rem] leading-relaxed text-[color:var(--vd-muted)]">
        {label
          ? `Einladung als „${label}“ annehmen und Belege eintragen.`
          : "Einladung annehmen und Belege für dieses Fahrzeug eintragen."}
      </p>
      <PressableButton
        type="button"
        variant="button"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-4 py-3.5 text-[0.88rem] font-semibold text-white disabled:opacity-60"
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const result = await acceptSchrauberInvite(token);
            if (result.status === "error") {
              setMessage(result.message);
              return;
            }
            router.push(
              result.tagUuid ? `/v/${result.tagUuid}?scan=1` : "/auth/continue",
            );
          });
        }}
      >
        <Wrench className="h-4 w-4" aria-hidden />
        Einladung annehmen
      </PressableButton>
      {message ? (
        <p className="text-[0.85rem] text-red-700" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
