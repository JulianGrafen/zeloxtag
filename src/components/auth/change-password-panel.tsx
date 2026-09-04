"use client";

import { useState, useTransition } from "react";

import { changeAccountPassword } from "@/lib/auth/actions";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";

export function ChangePasswordPanel({
  hasPasswordLogin,
}: {
  hasPasswordLogin: boolean;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canSubmit =
    newPassword.length >= 10 &&
    confirmPassword.length >= 10 &&
    (!hasPasswordLogin || currentPassword.length > 0);

  return (
    <section
      aria-label="Passwort"
      className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow-sm)]"
    >
      <h2 className="font-[family-name:var(--font-display)] text-[1.2rem] font-semibold text-[color:var(--vd-text)]">
        Passwort
      </h2>
      <p className="mt-2 text-[0.85rem] leading-relaxed text-[color:var(--vd-muted)]">
        {hasPasswordLogin
          ? "Ändere dein Anmeldepasswort. Mindestens 10 Zeichen."
          : "Du meldest dich mit Google an. Optional kannst du hier ein Passwort festlegen, um dich künftig auch per E-Mail anzumelden."}
      </p>

      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          setMessage(null);
          setError(null);
          startTransition(async () => {
            const result = await changeAccountPassword(
              hasPasswordLogin ? currentPassword : null,
              newPassword,
              confirmPassword,
            );
            if (result.status === "rate_limited") {
              setError(
                `Zu viele Versuche. Bitte in ${result.retryAfterSec}s warten.`,
              );
              return;
            }
            if (result.status === "ok") {
              setMessage(result.message ?? "Passwort gespeichert.");
              setCurrentPassword("");
              setNewPassword("");
              setConfirmPassword("");
              return;
            }
            if (result.status === "unconfigured") {
              setError("Supabase ist nicht konfiguriert.");
              return;
            }
            if (result.status === "error") {
              setError(result.message);
            }
          });
        }}
      >
        {hasPasswordLogin ? (
          <label className="block space-y-1.5">
            <span className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
              Aktuelles Passwort
            </span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="w-full rounded-xl border border-[color:var(--vd-border)] bg-white px-3 py-2.5 text-[0.9rem] text-[color:var(--vd-text)] outline-none ring-neutral-900 focus:ring-2"
            />
          </label>
        ) : null}

        <label className="block space-y-1.5">
          <span className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
            {hasPasswordLogin ? "Neues Passwort" : "Passwort festlegen"}
          </span>
          <input
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="w-full rounded-xl border border-[color:var(--vd-border)] bg-white px-3 py-2.5 text-[0.9rem] text-[color:var(--vd-text)] outline-none ring-neutral-900 focus:ring-2"
            placeholder="Mindestens 10 Zeichen"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
            Passwort bestätigen
          </span>
          <input
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="w-full rounded-xl border border-[color:var(--vd-border)] bg-white px-3 py-2.5 text-[0.9rem] text-[color:var(--vd-text)] outline-none ring-neutral-900 focus:ring-2"
            placeholder="Passwort wiederholen"
          />
        </label>

        {error ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-[0.8rem] text-red-700">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-[0.8rem] text-emerald-800">
            {message}
          </p>
        ) : null}

        <PressableButton
          type="submit"
          variant="button"
          disabled={pending || !canSubmit}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-neutral-900 px-4 py-3.5 text-[0.88rem] font-semibold text-white disabled:opacity-60"
        >
          {pending
            ? "Speichern…"
            : hasPasswordLogin
              ? "Passwort ändern"
              : "Passwort festlegen"}
        </PressableButton>
      </form>
    </section>
  );
}
