"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import QRCode from "qrcode";
import {
  Check,
  Copy,
  Download,
  QrCode,
  Trash2,
  UserPlus,
  UserRound,
} from "lucide-react";

import {
  createSchrauberInvite,
  listVehicleContributors,
  revokeSchrauberInvite,
  setSchrauberReadHistory,
  type ContributorRow,
} from "@/actions/vehicle-contributors";
import {
  IOS_SECTION_HEADER,
  IOSEmptyState,
  IOSSwitch,
  InsetGroupedCard,
  InsetListRow,
  type IconBadgeTone,
} from "@/components/ui/ios";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import { formatDocumentDate } from "@/lib/documents/format";
import { cn } from "@/lib/utils";

type SchrauberManagePanelProps = {
  vehicleId: string;
  tagUuid: string;
  /** Demo showcase — UI only, no invites or API writes. */
  readOnly?: boolean;
};

const STATUS_PILL: Record<
  ContributorRow["status"],
  { label: string; className: string; tone: IconBadgeTone }
> = {
  invited: {
    label: "Eingeladen",
    className: "bg-amber-500/15 text-amber-400",
    tone: "amber",
  },
  active: {
    label: "Aktiv",
    className: "bg-emerald-500/15 text-emerald-400",
    tone: "green",
  },
  revoked: {
    label: "Widerrufen",
    className: "bg-red-500/15 text-red-400",
    tone: "red",
  },
};

const ROLE_LABEL: Record<ContributorRow["role"], string> = {
  schrauber: "Werkstatt",
};

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

function absoluteInvite(path: string): string {
  const origin = resolveInviteOrigin();
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

async function buildInviteQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 512,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#0a0a0a", light: "#ffffff" },
  });
}

function downloadDataUrl(dataUrl: string, fileName: string) {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = fileName;
  anchor.click();
}

function contributorMeta(row: ContributorRow): string {
  const base =
    row.status === "invited" ? "Einladung offen" : row.userEmail || "Aktiv";
  if (row.status !== "invited" || !row.expiresAt) return base;
  return `${base} · gültig bis ${formatDocumentDate(row.expiresAt.slice(0, 10))}`;
}

function StatusPill({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
        className,
      )}
    >
      {children}
    </span>
  );
}

function HistoryAccessRow({
  checked,
  disabled,
  onChange,
  description,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  description: string;
}) {
  return (
    <InsetListRow
      emphasis="navigation"
      label="Alte Rechnungen anzeigen"
      sublabel={description}
      trailing={
        <IOSSwitch
          checked={checked}
          disabled={disabled}
          onCheckedChange={onChange}
          ariaLabel="Alte Rechnungen anzeigen"
        />
      }
    />
  );
}

function InviteShareCard({
  inviteUrl,
  inviteQr,
  copied,
  fileName,
  onCopy,
}: {
  inviteUrl: string;
  inviteQr: string | null;
  copied: boolean;
  fileName: string;
  onCopy: () => void;
}) {
  return (
    <InsetGroupedCard
      header="Einladung · Link & QR"
      footer="Werkstatt scannt den QR oder öffnet den Link, gibt die E-Mail ein und tippt den Anmelde-Link — danach kann sie sofort Belege eintragen."
    >
      <div className="flex justify-center px-4 py-4">
        {inviteQr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={inviteQr}
            alt="QR-Code zur Schrauber-Einladung"
            width={220}
            height={220}
            className="h-auto w-[min(70vw,220px)] rounded-xl"
          />
        ) : (
          <div className="flex h-[220px] w-[220px] items-center justify-center text-[13px] text-[#8E8E93]">
            QR wird erzeugt…
          </div>
        )}
      </div>
      <InsetListRow
        emphasis="navigation"
        icon={copied ? Check : Copy}
        iconTone={copied ? "green" : "blue"}
        label={copied ? "Kopiert" : "Link kopieren"}
        sublabel={<span className="break-all font-mono">{inviteUrl}</span>}
        onPress={onCopy}
        chevron={false}
      />
      {inviteQr ? (
        <InsetListRow
          emphasis="navigation"
          icon={Download}
          iconTone="blue"
          label="QR speichern"
          onPress={() => downloadDataUrl(inviteQr, fileName)}
          chevron={false}
        />
      ) : null}
    </InsetGroupedCard>
  );
}

function ContributorCard({
  row,
  pending,
  onShowQr,
  onRevoke,
  onReadHistoryChange,
}: {
  row: ContributorRow;
  pending: boolean;
  onShowQr?: () => void;
  onRevoke: () => void;
  onReadHistoryChange: (next: boolean) => void;
}) {
  const status = STATUS_PILL[row.status];

  return (
    <InsetGroupedCard>
      <InsetListRow
        emphasis="item"
        icon={UserRound}
        iconTone={status.tone}
        label={row.label || row.userEmail || "Schrauber"}
        sublabel={contributorMeta(row)}
        trailing={
          <span className="flex shrink-0 flex-col items-end gap-1">
            <StatusPill className="bg-blue-500/15 text-blue-400">
              {ROLE_LABEL[row.role]}
            </StatusPill>
            <StatusPill className={status.className}>{status.label}</StatusPill>
          </span>
        }
      />
      <HistoryAccessRow
        checked={row.canReadHistory}
        disabled={pending}
        onChange={onReadHistoryChange}
        description={
          row.canReadHistory
            ? "Sieht alte Rechnungen & Historie"
            : "Nur neue Rechnungen einscannen"
        }
      />
      {onShowQr ? (
        <InsetListRow
          emphasis="navigation"
          icon={QrCode}
          iconTone="neutral"
          label="Einladungs-QR anzeigen"
          onPress={onShowQr}
          chevron={false}
        />
      ) : null}
      <InsetListRow
        emphasis="navigation"
        icon={Trash2}
        iconTone="red"
        label="Zugang widerrufen"
        destructive
        disabled={pending}
        onPress={onRevoke}
        chevron={false}
      />
    </InsetGroupedCard>
  );
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

  function handleCreateInvite() {
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
  }

  async function handleCopyInvite() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
    } catch {
      setMessage("Kopieren fehlgeschlagen — Link manuell markieren.");
    }
  }

  function handleShowQr(row: ContributorRow) {
    setMessage(null);
    setCopied(false);
    setInviteUrl(absoluteInvite(`/einladung/${row.inviteToken}`));
  }

  function handleRevoke(row: ContributorRow) {
    startTransition(async () => {
      const result = await revokeSchrauberInvite(vehicleId, row.id);
      if (result.status === "ok" && result.contributors) {
        setRows(result.contributors);
      } else if (result.status === "error") {
        setMessage(result.message);
      }
    });
  }

  function handleReadHistoryChange(row: ContributorRow, next: boolean) {
    setMessage(null);
    setRows((current) =>
      current.map((item) =>
        item.id === row.id ? { ...item, canReadHistory: next } : item,
      ),
    );
    startTransition(async () => {
      const result = await setSchrauberReadHistory(vehicleId, row.id, next);
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
  }

  return (
    <>
      {readOnly ? (
        <IOSEmptyState>
          Demo — Einladungen und Schrauber-Verwaltung sind hier nur zur Ansicht.
        </IOSEmptyState>
      ) : null}

      <div className="flex flex-col gap-3">
        <InsetGroupedCard
          header="Werkstatt einladen"
          footer="Mit dem Link kann eine Werkstatt Reparaturen, Service und Rechnungen für dieses Fahrzeug eintragen — per E-Mail-Link, ohne Passwort."
        >
          <InsetListRow
            emphasis="navigation"
            label={<label htmlFor="schrauber-invite-label">Name</label>}
            trailing={
              <input
                id="schrauber-invite-label"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="z. B. Garage Nord (optional)"
                disabled={readOnly}
                className="w-[62%] min-w-0 bg-transparent text-right text-[15px] text-white outline-none placeholder:text-[#48484A] disabled:opacity-60"
              />
            }
          />
          <HistoryAccessRow
            checked={inviteCanReadHistory}
            disabled={readOnly || pending}
            onChange={setInviteCanReadHistory}
            description="Aus: Werkstatt darf nur neue Rechnungen einscannen — ohne Einsicht in bestehende Historie."
          />
        </InsetGroupedCard>

        <PressableButton
          type="button"
          variant="button"
          disabled={readOnly || pending}
          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-white text-[15px] font-semibold text-black disabled:opacity-60"
          onClick={handleCreateInvite}
        >
          <UserPlus className="h-4 w-4" aria-hidden />
          Einladungslink erstellen
        </PressableButton>

        {message ? (
          <p className="px-4 text-[13px] text-[#FF453A]" role="alert">
            {message}
          </p>
        ) : null}
      </div>

      {inviteUrl ? (
        <InviteShareCard
          inviteUrl={inviteUrl}
          inviteQr={inviteQr}
          copied={copied}
          fileName={`zeloxtag-schrauber-${tagUuid.slice(0, 8)}.png`}
          onCopy={() => void handleCopyInvite()}
        />
      ) : null}

      <section aria-labelledby="schrauber-active-heading">
        <h2 id="schrauber-active-heading" className={IOS_SECTION_HEADER}>
          Aktive Zugänge
        </h2>
        <div className="flex flex-col gap-3">
          {rows.length === 0 ? (
            <IOSEmptyState icon={UserRound}>
              Noch keine Schrauber eingeladen.
            </IOSEmptyState>
          ) : (
            rows.map((row) => (
              <ContributorCard
                key={row.id}
                row={row}
                pending={pending}
                onShowQr={
                  row.status === "invited" && row.inviteToken
                    ? () => handleShowQr(row)
                    : undefined
                }
                onRevoke={() => handleRevoke(row)}
                onReadHistoryChange={(next) =>
                  handleReadHistoryChange(row, next)
                }
              />
            ))
          )}
        </div>
      </section>
    </>
  );
}
