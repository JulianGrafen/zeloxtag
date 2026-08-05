"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Copy, Link2, Trash2, UserPlus } from "lucide-react";

import {
  createSchrauberInvite,
  listVehicleContributors,
  revokeSchrauberInvite,
  type ContributorRow,
} from "@/actions/vehicle-contributors";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";

type SchrauberManagePanelProps = {
  vehicleId: string;
  tagUuid: string;
};

export function SchrauberManagePanel({
  vehicleId,
  tagUuid,
}: SchrauberManagePanelProps) {
  const [label, setLabel] = useState("");
  const [rows, setRows] = useState<ContributorRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await listVehicleContributors(vehicleId);
      if (result.status === "ok" && result.contributors) {
        setRows(result.contributors);
      }
    });
  }, [vehicleId]);

  const absoluteInvite = (path: string) => {
    if (typeof window === "undefined") return path;
    return `${window.location.origin}${path}`;
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow-sm)]">
        <h2 className="font-[family-name:var(--font-display)] text-[1.15rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
          Schrauber einladen
        </h2>
        <p className="mt-2 text-[0.88rem] leading-relaxed text-[color:var(--vd-muted)]">
          Mit dem Link kann eine Werkstatt Reparaturen, Service und Rechnungen
          für dieses Fahrzeug eintragen — ohne vollen Eigentümer-Zugriff.
        </p>

        <label className="mt-4 block space-y-1.5">
          <span className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
            Name / Werkstatt (optional)
          </span>
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="z. B. Garage Nord"
            className="w-full rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-bg)] px-3 py-3 text-[0.92rem] text-[color:var(--vd-text)] outline-none focus:border-neutral-400"
          />
        </label>

        <PressableButton
          type="button"
          variant="button"
          disabled={pending}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-4 py-3.5 text-[0.88rem] font-semibold text-white disabled:opacity-60"
          onClick={() => {
            setMessage(null);
            setInviteUrl(null);
            setCopied(false);
            startTransition(async () => {
              const result = await createSchrauberInvite(vehicleId, label);
              if (result.status === "error") {
                setMessage(result.message);
                return;
              }
              if (result.inviteUrl) {
                setInviteUrl(absoluteInvite(result.inviteUrl));
              }
              const listed = await listVehicleContributors(vehicleId);
              if (listed.status === "ok" && listed.contributors) {
                setRows(listed.contributors);
              }
              setLabel("");
            });
          }}
        >
          <UserPlus className="h-4 w-4" aria-hidden />
          Einladungslink erstellen
        </PressableButton>

        {inviteUrl ? (
          <div className="mt-4 space-y-2 rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-bg)] p-3">
            <p className="flex items-center gap-2 text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
              <Link2 className="h-3.5 w-3.5" aria-hidden />
              Einladungslink
            </p>
            <p className="break-all text-[0.82rem] text-[color:var(--vd-text)]">
              {inviteUrl}
            </p>
            <PressableButton
              type="button"
              variant="button"
              className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.8rem] font-medium text-[color:var(--vd-text)]"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(inviteUrl);
                  setCopied(true);
                } catch {
                  setMessage("Kopieren fehlgeschlagen — Link manuell markieren.");
                }
              }}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden />
              )}
              {copied ? "Kopiert" : "Link kopieren"}
            </PressableButton>
          </div>
        ) : null}

        {message ? (
          <p className="mt-3 text-[0.85rem] text-red-700" role="alert">
            {message}
          </p>
        ) : null}
      </section>

      <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow-sm)]">
        <h2 className="font-[family-name:var(--font-display)] text-[1.15rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
          Aktive Zugänge
        </h2>
        {rows.length === 0 ? (
          <p className="mt-3 text-[0.88rem] text-[color:var(--vd-muted)]">
            Noch keine Schrauber eingeladen.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex items-start justify-between gap-3 rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-bg)] px-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-[0.92rem] font-medium text-[color:var(--vd-text)]">
                    {row.label || row.userEmail || "Schrauber"}
                  </p>
                  <p className="mt-0.5 text-[0.78rem] text-[color:var(--vd-muted)]">
                    {row.status === "invited"
                      ? "Einladung offen"
                      : row.userEmail || "Aktiv"}
                    {row.expiresAt && row.status === "invited"
                      ? ` · gültig bis ${new Date(row.expiresAt).toLocaleDateString("de-DE")}`
                      : ""}
                  </p>
                </div>
                <PressableButton
                  type="button"
                  variant="button"
                  disabled={pending}
                  aria-label="Zugang widerrufen"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--vd-border)] text-[color:var(--vd-muted)]"
                  onClick={() => {
                    startTransition(async () => {
                      const result = await revokeSchrauberInvite(
                        vehicleId,
                        row.id,
                      );
                      if (result.status === "ok" && result.contributors) {
                        setRows(result.contributors);
                      } else if (result.status === "error") {
                        setMessage(result.message);
                      }
                      // Keep tag page fresh after revoke.
                      void tagUuid;
                    });
                  }}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </PressableButton>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
