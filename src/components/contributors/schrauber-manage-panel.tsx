"use client";

import { useEffect, useState, useTransition } from "react";
import QRCode from "qrcode";
import {
  Check,
  Copy,
  Download,
  Link2,
  QrCode,
  Trash2,
  UserPlus,
} from "lucide-react";

import {
  createSchrauberInvite,
  listVehicleContributors,
  revokeSchrauberInvite,
  setSchrauberReadHistory,
  type ContributorRow,
} from "@/actions/vehicle-contributors";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";

type SchrauberManagePanelProps = {
  vehicleId: string;
  tagUuid: string;
  /** Demo showcase — UI only, no invites or API writes. */
  readOnly?: boolean;
};

function HistoryAccessToggle({
  checked,
  disabled,
  onChange,
  id,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  id: string;
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50 ${
        checked
          ? "border-neutral-900 bg-neutral-900"
          : "border-[color:var(--vd-border)] bg-[color:var(--vd-bg)]"
      }`}
    >
      <span
        className={`inline-block h-6 w-6 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-7" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function resolveInviteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (typeof window === "undefined") {
    return configured || "";
  }
  if (
    configured &&
    !configured.includes("localhost") &&
    !configured.includes("zeloxtag.de")
  ) {
    return configured;
  }
  // Prefer app domain over Shopify shop host when present.
  if (configured === "https://app.zeloxtag.de") {
    return configured;
  }
  return window.location.origin;
}

async function buildInviteQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 512,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#0a0a0a", light: "#ffffff" },
  });
}

export function SchrauberManagePanel({
  vehicleId,
  tagUuid,
  readOnly = false,
}: SchrauberManagePanelProps) {
  const [label, setLabel] = useState("");
  const [inviteCanReadHistory, setInviteCanReadHistory] = useState(false);
  const [rows, setRows] = useState<ContributorRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteQr, setInviteQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (readOnly) return;
    startTransition(async () => {
      const result = await listVehicleContributors(vehicleId);
      if (result.status === "ok" && result.contributors) {
        setRows(result.contributors);
      }
    });
  }, [vehicleId, readOnly]);

  useEffect(() => {
    if (!inviteUrl) {
      setInviteQr(null);
      return;
    }
    let cancelled = false;
    void buildInviteQrDataUrl(inviteUrl)
      .then((dataUrl) => {
        if (!cancelled) setInviteQr(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setInviteQr(null);
      });
    return () => {
      cancelled = true;
    };
  }, [inviteUrl]);

  const absoluteInvite = (path: string) => {
    const origin = resolveInviteOrigin();
    return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
  };

  return (
    <div className="space-y-5">
      {readOnly ? (
        <p className="rounded-[1.35rem] border border-dashed border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-4 py-3 text-[0.85rem] text-[color:var(--vd-muted)]">
          Demo — Einladungen und Schrauber-Verwaltung sind hier nur zur Ansicht.
        </p>
      ) : null}
      <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow-sm)]">
        <h2 className="font-[family-name:var(--font-display)] text-[1.15rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
          Schrauber einladen
        </h2>
        <p className="mt-2 text-[0.88rem] leading-relaxed text-[color:var(--vd-muted)]">
          Mit dem Link kann eine Werkstatt Reparaturen, Service und Rechnungen
          für dieses Fahrzeug eintragen — per E-Mail-Link, ohne Passwort.
        </p>

        <label className="mt-4 block space-y-1.5">
          <span className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
            Name / Werkstatt (optional)
          </span>
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="z. B. Garage Nord"
            disabled={readOnly}
            className="w-full rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-bg)] px-3 py-3 text-[0.92rem] text-[color:var(--vd-text)] outline-none focus:border-neutral-400 disabled:opacity-60"
          />
        </label>

        <div className="mt-4 flex items-start justify-between gap-4 rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-bg)] px-3 py-3">
          <label htmlFor="invite-read-history" className="min-w-0 space-y-1">
            <span className="block text-[0.9rem] font-medium text-[color:var(--vd-text)]">
              Alte Rechnungen anzeigen
            </span>
            <span className="block text-[0.78rem] leading-relaxed text-[color:var(--vd-muted)]">
              Aus: Werkstatt darf nur neue Rechnungen einscannen — ohne Einsicht
              in bestehende Historie.
            </span>
          </label>
          <HistoryAccessToggle
            id="invite-read-history"
            checked={inviteCanReadHistory}
            disabled={readOnly || pending}
            onChange={setInviteCanReadHistory}
          />
        </div>

        <PressableButton
          type="button"
          variant="button"
          disabled={readOnly || pending}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-4 py-3.5 text-[0.88rem] font-semibold text-white disabled:opacity-60"
          onClick={() => {
            setMessage(null);
            setInviteUrl(null);
            setInviteQr(null);
            setCopied(false);
            startTransition(async () => {
              const result = await createSchrauberInvite(
                vehicleId,
                label,
                inviteCanReadHistory,
              );
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
              setInviteCanReadHistory(false);
            });
          }}
        >
          <UserPlus className="h-4 w-4" aria-hidden />
          Einladungslink erstellen
        </PressableButton>

        {inviteUrl ? (
          <div className="mt-4 space-y-3 rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-bg)] p-3">
            <p className="flex items-center gap-2 text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
              <QrCode className="h-3.5 w-3.5" aria-hidden />
              Einladung · Link & QR
            </p>

            <div className="flex justify-center rounded-2xl bg-white p-4">
              {inviteQr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={inviteQr}
                  alt="QR-Code zur Schrauber-Einladung"
                  width={220}
                  height={220}
                  className="h-auto w-[min(70vw,220px)]"
                />
              ) : (
                <div className="flex h-[220px] w-[220px] items-center justify-center text-[0.8rem] text-[color:var(--vd-muted)]">
                  QR wird erzeugt…
                </div>
              )}
            </div>

            <p className="break-all font-mono text-[0.78rem] text-[color:var(--vd-text)]">
              {inviteUrl}
            </p>

            <div className="flex flex-wrap gap-2">
              <PressableButton
                type="button"
                variant="button"
                className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.8rem] font-medium text-[color:var(--vd-text)]"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(inviteUrl);
                    setCopied(true);
                  } catch {
                    setMessage(
                      "Kopieren fehlgeschlagen — Link manuell markieren.",
                    );
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

              {inviteQr ? (
                <a
                  href={inviteQr}
                  download={`zeloxtag-schrauber-${tagUuid.slice(0, 8)}.png`}
                  className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.8rem] font-medium text-[color:var(--vd-text)]"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden />
                  QR speichern
                </a>
              ) : null}
            </div>

            <p className="flex items-start gap-2 text-[0.75rem] leading-relaxed text-[color:var(--vd-muted)]">
              <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              Werkstatt scannt den QR oder öffnet den Link, gibt die E-Mail ein
              und tippt den Anmelde-Link — danach kann sie sofort Belege
              eintragen.
            </p>
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
                className="space-y-3 rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-bg)] px-3 py-3"
              >
                <div className="flex items-start justify-between gap-3">
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
                  <div className="flex shrink-0 items-center gap-1.5">
                    {row.status === "invited" && row.inviteToken ? (
                      <PressableButton
                        type="button"
                        variant="button"
                        aria-label="Einladungs-QR anzeigen"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--vd-border)] text-[color:var(--vd-muted)]"
                        onClick={() => {
                          setMessage(null);
                          setCopied(false);
                          setInviteUrl(
                            absoluteInvite(`/einladung/${row.inviteToken}`),
                          );
                        }}
                      >
                        <QrCode className="h-4 w-4" aria-hidden />
                      </PressableButton>
                    ) : null}
                    <PressableButton
                      type="button"
                      variant="button"
                      disabled={pending}
                      aria-label="Zugang widerrufen"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--vd-border)] text-[color:var(--vd-muted)]"
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
                          void tagUuid;
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </PressableButton>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-[color:var(--vd-border)] pt-3">
                  <label
                    htmlFor={`read-history-${row.id}`}
                    className="min-w-0 text-[0.8rem] leading-snug text-[color:var(--vd-muted)]"
                  >
                    {row.canReadHistory
                      ? "Sieht alte Rechnungen & Historie"
                      : "Nur neue Rechnungen einscannen"}
                  </label>
                  <HistoryAccessToggle
                    id={`read-history-${row.id}`}
                    checked={row.canReadHistory}
                    disabled={pending}
                    onChange={(next) => {
                      setMessage(null);
                      setRows((current) =>
                        current.map((item) =>
                          item.id === row.id
                            ? { ...item, canReadHistory: next }
                            : item,
                        ),
                      );
                      startTransition(async () => {
                        const result = await setSchrauberReadHistory(
                          vehicleId,
                          row.id,
                          next,
                        );
                        if (result.status === "ok" && result.contributors) {
                          setRows(result.contributors);
                        } else if (result.status === "error") {
                          setMessage(result.message);
                          const listed = await listVehicleContributors(vehicleId);
                          if (listed.status === "ok" && listed.contributors) {
                            setRows(listed.contributors);
                          }
                        }
                      });
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
