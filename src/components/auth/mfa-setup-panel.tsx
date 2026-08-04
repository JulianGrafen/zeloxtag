"use client";

import { useEffect, useState, useTransition } from "react";

import {
  enrollTotp,
  listMfaFactors,
  unenrollTotp,
  verifyTotpEnrollment,
} from "@/lib/auth/mfa-actions";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";

type Factor = { id: string; friendlyName: string | null };

export function MfaSetupPanel() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refreshFactors = () => {
    startTransition(async () => {
      const result = await listMfaFactors();
      if (result.status === "factors") {
        setFactors(result.factors);
      }
    });
  };

  useEffect(() => {
    refreshFactors();
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow-sm)]">
        <h2 className="font-[family-name:var(--font-display)] text-[1.2rem] font-semibold text-[color:var(--vd-text)]">
          Zwei-Faktor-Authentifizierung (2FA)
        </h2>
        <p className="mt-2 text-[0.85rem] leading-relaxed text-[color:var(--vd-muted)]">
          Optional: Schütze dein Konto mit einem Authenticator (Google Authenticator,
          1Password, Authy, …). Nach der Aktivierung brauchst du bei jedem Login
          zusätzlich einen 6-stelligen Code.
        </p>

        {factors.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {factors.map((factor) => (
              <li
                key={factor.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--vd-border)] px-3 py-2"
              >
                <span className="text-[0.85rem] text-[color:var(--vd-text)]">
                  {factor.friendlyName ?? "Authenticator"}
                </span>
                <PressableButton
                  type="button"
                  variant="button"
                  disabled={pending}
                  onClick={() => {
                    setError(null);
                    setMessage(null);
                    startTransition(async () => {
                      const result = await unenrollTotp(factor.id);
                      if (result.status === "ok") {
                        setMessage(result.message ?? "Entfernt.");
                        refreshFactors();
                        return;
                      }
                      setError(
                        result.status === "error"
                          ? result.message
                          : "Entfernen fehlgeschlagen.",
                      );
                    });
                  }}
                  className="rounded-xl bg-red-600 px-3 py-2 text-[0.75rem] font-semibold text-white"
                >
                  Entfernen
                </PressableButton>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-[0.8rem] text-[color:var(--vd-muted)]">
            2FA ist noch nicht aktiviert.
          </p>
        )}

        {!qrCode ? (
          <PressableButton
            type="button"
            variant="button"
            disabled={pending}
            onClick={() => {
              setError(null);
              setMessage(null);
              startTransition(async () => {
                const result = await enrollTotp("ZeloxTag");
                if (result.status === "enrolled") {
                  setFactorId(result.factorId);
                  setQrCode(result.qrCode);
                  setSecret(result.secret);
                  return;
                }
                setError(
                  result.status === "error" ? result.message : "Enroll fehlgeschlagen.",
                );
              });
            }}
            className="mt-4 inline-flex rounded-2xl bg-neutral-900 px-4 py-3 text-[0.85rem] font-semibold text-white"
          >
            2FA aktivieren
          </PressableButton>
        ) : null}
      </div>

      {qrCode && factorId ? (
        <div className="space-y-3 rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow-sm)]">
          <p className="text-[0.85rem] text-[color:var(--vd-muted)]">
            Scanne den QR-Code und bestätige mit dem aktuellen Code.
          </p>
          <div className="mx-auto flex h-48 w-48 items-center justify-center overflow-hidden rounded-xl bg-white p-2">
            {/* data: URL from Supabase enroll — avoid next/image for data URIs */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrCode} alt="TOTP QR-Code" className="h-full w-full object-contain" />
          </div>
          {secret ? (
            <p className="break-all text-center font-mono text-[0.72rem] text-[color:var(--vd-muted)]">
              Manueller Schlüssel: {secret}
            </p>
          ) : null}
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              setError(null);
              startTransition(async () => {
                const result = await verifyTotpEnrollment(factorId, code);
                if (result.status === "verified") {
                  setMessage("2FA erfolgreich aktiviert.");
                  setQrCode(null);
                  setSecret(null);
                  setFactorId(null);
                  setCode("");
                  refreshFactors();
                  return;
                }
                setError(
                  result.status === "error" ? result.message : "Verifizierung fehlgeschlagen.",
                );
              });
            }}
          >
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              required
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="w-full rounded-xl border border-[color:var(--vd-border)] bg-white px-3 py-2.5 text-center font-mono text-[1.1rem] tracking-[0.3em] outline-none ring-neutral-900 focus:ring-2"
              placeholder="000000"
            />
            <PressableButton
              type="submit"
              variant="button"
              disabled={pending || code.length !== 6}
              className="inline-flex w-full justify-center rounded-2xl bg-neutral-900 px-4 py-3 text-[0.85rem] font-semibold text-white disabled:opacity-60"
            >
              Aktivierung bestätigen
            </PressableButton>
          </form>
        </div>
      ) : null}

      {message ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-[0.8rem] text-emerald-800">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-[0.8rem] text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
