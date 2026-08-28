"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Mail, Wrench } from "lucide-react";

import { acceptSchrauberInvite } from "@/actions/vehicle-contributors";
import { requestMagicLinkLogin } from "@/lib/auth/actions";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";

type AcceptInvitePanelProps = {
  token: string;
  vehicleLabel: string;
  label: string | null;
  tagUuid: string;
  expired: boolean;
  alreadyActive: boolean;
  isAuthenticated: boolean;
};

export function AcceptInvitePanel({
  token,
  vehicleLabel,
  label,
  tagUuid,
  expired,
  alreadyActive,
  isAuthenticated,
}: AcceptInvitePanelProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const invitePath = `/einladung/${token}`;

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
        onClick={() => router.push(`/v/${tagUuid}?scan=1`)}
      >
        Belege eintragen
      </PressableButton>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="space-y-3">
        <p className="text-[0.88rem] leading-relaxed text-[color:var(--vd-muted)]">
          Gib deine Werkstatt-E-Mail ein — du erhältst einen Anmelde-Link ohne
          Passwort und kannst sofort Belege für {vehicleLabel} eintragen.
        </p>
        <label className="block space-y-1.5">
          <span className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
            E-Mail
          </span>
          <input
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setMessage(null);
              setInfo(null);
            }}
            placeholder="werkstatt@beispiel.de"
            className="claim-input w-full"
          />
        </label>
        {info ? (
          <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-[0.8rem] text-emerald-800" role="status">
            {info}
          </p>
        ) : null}
        {message ? (
          <p className="text-[0.85rem] text-red-700" role="alert">
            {message}
          </p>
        ) : null}
        <PressableButton
          type="button"
          variant="button"
          disabled={pending || !email.trim()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-4 py-3.5 text-[0.88rem] font-semibold text-white disabled:opacity-60"
          onClick={() => {
            setMessage(null);
            setInfo(null);
            startTransition(async () => {
              const result = await requestMagicLinkLogin(
                email,
                invitePath,
                vehicleLabel,
                token,
              );
              if (result.status === "error") {
                setMessage(result.message);
                return;
              }
              if (result.status === "unconfigured") {
                setMessage(
                  "Anmeldung ist derzeit nicht verfügbar. Bitte später erneut versuchen.",
                );
                return;
              }
              if (result.status === "rate_limited") {
                setMessage(
                  `Zu viele Versuche. Bitte in ${result.retryAfterSec}s erneut versuchen.`,
                );
                return;
              }
              if (result.status === "ok") {
                setInfo(
                  result.message ??
                    "Prüfe dein Postfach — der Link führt zurück zu dieser Einladung.",
                );
              }
            });
          }}
        >
          <Mail className="h-4 w-4" aria-hidden />
          {pending ? "Link wird gesendet…" : "Anmelde-Link senden"}
        </PressableButton>
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
