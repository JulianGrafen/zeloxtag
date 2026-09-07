"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Download, Trash2 } from "lucide-react";

import { cancelAccountDeletionAction } from "@/actions/cancel-account-deletion";
import { requestAccountDeletionAction } from "@/actions/request-account-deletion";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import {
  formatGraceEndDateGerman,
  type AccountDeletionState,
} from "@/lib/account/account-deletion-shared";

type AccountDeletionPanelProps = {
  userEmail: string;
  hasPasswordLogin: boolean;
  deletionState: AccountDeletionState;
};

export function AccountDeletionPanel({
  userEmail,
  hasPasswordLogin,
  deletionState,
}: AccountDeletionPanelProps) {
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const inGrace = deletionState.status === "grace";
  const graceEndsAt = deletionState.graceEndsAt;
  const graceLabel = graceEndsAt
    ? formatGraceEndDateGerman(graceEndsAt)
    : null;

  return (
    <section
      aria-label="Konto löschen"
      className="vd-surface-card border border-red-200/80 p-5 shadow-[var(--vd-shadow-sm)]"
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-700"
          aria-hidden
        >
          <Trash2 className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-[family-name:var(--font-display)] text-[1.05rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
            Konto löschen
          </h2>
          <p className="mt-1 text-[0.85rem] leading-relaxed text-[color:var(--vd-muted)]">
            {inGrace
              ? `Dein Konto ist read-only und wird am ${graceLabel} endgültig gelöscht. Du kannst deine Daten als ZIP exportieren oder die Löschung widerrufen.`
              : "Löscht dein Konto und alle Fahrzeugdaten nach einer 30-tägigen Frist. Währenddessen kannst du deine Akte exportieren."}
          </p>
        </div>
      </div>

      {inGrace ? (
        <div className="mt-4 space-y-3">
          <div
            className="flex items-start gap-2 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2.5 text-[0.82rem] text-amber-950"
            role="status"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>
              Noch{" "}
              <strong>{deletionState.daysRemaining ?? 0} Tage</strong> bis zur
              endgültigen Löschung
              {graceLabel ? ` (${graceLabel})` : ""}.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href="/api/account/export"
              className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--vd-border)] bg-white px-3.5 py-2 text-[0.85rem] font-medium text-[color:var(--vd-text)]"
            >
              <Download className="h-4 w-4" aria-hidden />
              Daten exportieren (ZIP)
            </a>
            <PressableButton
              type="button"
              variant="button"
              disabled={pending}
              onClick={() => {
                setError(null);
                setMessage(null);
                startTransition(async () => {
                  const result = await cancelAccountDeletionAction();
                  if (result.status === "error") {
                    setError(result.message);
                    return;
                  }
                  setMessage("Löschung widerrufen — dein Konto ist wieder aktiv.");
                });
              }}
            >
              Löschung widerrufen
            </PressableButton>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          {!showDeleteForm ? (
            <PressableButton
              type="button"
              variant="button"
              className="border-red-200 text-red-800 hover:bg-red-50"
              onClick={() => {
                setShowDeleteForm(true);
                setError(null);
                setMessage(null);
              }}
            >
              Konto löschen …
            </PressableButton>
          ) : (
            <form
              className="space-y-3 rounded-xl border border-red-200/70 bg-red-50/40 p-4"
              onSubmit={(event) => {
                event.preventDefault();
                setError(null);
                setMessage(null);
                startTransition(async () => {
                  const result = await requestAccountDeletionAction({
                    confirmEmail,
                    password: hasPasswordLogin ? password : null,
                  });
                  if (result.status === "error") {
                    setError(result.message);
                    return;
                  }
                  setShowDeleteForm(false);
                  setConfirmEmail("");
                  setPassword("");
                  setMessage(
                    `Löschung gestartet. Endgültige Löschung am ${formatGraceEndDateGerman(result.graceEndsAt)}.`,
                  );
                });
              }}
            >
              <p className="text-[0.82rem] leading-relaxed text-red-950">
                Zur Bestätigung gib deine E-Mail{" "}
                <span className="font-medium">{userEmail}</span> ein.
                {hasPasswordLogin
                  ? " Zusätzlich ist dein Passwort erforderlich."
                  : ""}
              </p>
              <label className="block space-y-1.5">
                <span className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
                  E-Mail bestätigen
                </span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={confirmEmail}
                  onChange={(event) => setConfirmEmail(event.target.value)}
                  className="w-full rounded-xl border border-[color:var(--vd-border)] bg-white px-3 py-2.5 text-[0.9rem] text-[color:var(--vd-text)] outline-none ring-neutral-900 focus:ring-2"
                />
              </label>
              {hasPasswordLogin ? (
                <label className="block space-y-1.5">
                  <span className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
                    Passwort
                  </span>
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-xl border border-[color:var(--vd-border)] bg-white px-3 py-2.5 text-[0.9rem] text-[color:var(--vd-text)] outline-none ring-neutral-900 focus:ring-2"
                  />
                </label>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-1">
                <PressableButton
                  type="submit"
                  variant="button"
                  className="bg-red-700 text-white hover:bg-red-800"
                  disabled={pending}
                >
                  Endgültig löschen
                </PressableButton>
                <PressableButton
                  type="button"
                  variant="button"
                  disabled={pending}
                  onClick={() => setShowDeleteForm(false)}
                >
                  Abbrechen
                </PressableButton>
              </div>
            </form>
          )}
        </div>
      )}

      {message ? (
        <p className="mt-3 text-[0.82rem] text-emerald-800" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 text-[0.82rem] text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
