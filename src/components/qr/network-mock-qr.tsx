"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw, Sparkles } from "lucide-react";

import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import { MAX_MINT_BATCH } from "@/lib/tags/mint-batch";
import {
  isPlaqueTagUuid,
  plaquePngFilename,
  plaqueScanUrl,
  plaqueSvgFilename,
  renderPlaqueQrPngDataUrl,
  renderPlaqueQrSvg,
} from "@/lib/tags/plaque-qr";

type QrSource = "supabase" | "minted";

type MintedPlaque = {
  uuid: string;
  source: QrSource;
  png: string;
  svg: string;
};

const BATCH_OPTIONS = [1, 5, 10, 20, 25] as const;
const DEFAULT_BATCH = 25;

function resolvePublicOrigin(): string {
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
  return window.location.origin;
}

function downloadTextFile(contents: string, filename: string, type: string) {
  const blob = new Blob([contents], { type });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}

async function downloadPlaqueZip(uuids: string[]): Promise<void> {
  const response = await fetch("/api/tags/qr/zip", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uuids }),
  });

  if (response.status === 401) {
    throw new Error("Bitte anmelden, um QR-Codes zu minten.");
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error || "ZIP konnte nicht erstellt werden.");
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const filename =
    disposition.match(/filename="([^"]+)"/)?.[1] ??
    `zeloxtag-mint-${uuids.length}.zip`;
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}

async function renderPlaque(
  origin: string,
  uuid: string,
  source: QrSource,
): Promise<MintedPlaque> {
  const url = plaqueScanUrl(origin, uuid);
  const [png, svg] = await Promise.all([
    renderPlaqueQrPngDataUrl(url),
    renderPlaqueQrSvg(url),
  ]);
  return { uuid, source, png, svg };
}

/**
 * Operator minter: create unclaimed tags and download laser-ready SVGs.
 */
export function NetworkMockQr() {
  const [origin, setOrigin] = useState<string>("");
  const [plaques, setPlaques] = useState<MintedPlaque[]>([]);
  const [lastBatchUuids, setLastBatchUuids] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [zipPending, setZipPending] = useState(false);
  const [count, setCount] = useState<(typeof BATCH_OPTIONS)[number]>(
    DEFAULT_BATCH,
  );

  const loadLatestUnclaimed = useCallback(async () => {
    const nextOrigin = resolvePublicOrigin();
    setOrigin(nextOrigin);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/tags/next-unclaimed", {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        uuid?: string | null;
        source?: string;
        error?: string;
      } | null;

      if (response.status === 401) {
        throw new Error("Bitte anmelden, um QR-Codes zu minten.");
      }
      if (!response.ok || !payload?.ok || !payload.uuid) {
        throw new Error(payload?.error || "Tag konnte nicht geladen werden.");
      }
      if (!isPlaqueTagUuid(payload.uuid)) {
        throw new Error("Demo-Fallback aktiv — keine echten QR-Codes.");
      }
      if (payload.source !== "supabase" && payload.source !== "minted") {
        throw new Error("Unerwartete Tag-Quelle.");
      }

      const plaque = await renderPlaque(
        nextOrigin,
        payload.uuid,
        payload.source,
      );
      setPlaques((current) => {
        if (current.some((item) => item.uuid === plaque.uuid)) return current;
        return [plaque, ...current];
      });
    } catch (buildError) {
      setError(
        buildError instanceof Error
          ? buildError.message
          : "QR-Code konnte nicht erzeugt werden.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const mintBatch = useCallback(
    async (options?: { downloadZip?: boolean }) => {
      const nextOrigin = resolvePublicOrigin();
      setOrigin(nextOrigin);
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/tags/mint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ count }),
        });
        const payload = (await response.json().catch(() => null)) as {
          ok?: boolean;
          tags?: Array<{ uuid: string }>;
          error?: string;
        } | null;

        if (response.status === 401) {
          throw new Error("Bitte anmelden, um QR-Codes zu minten.");
        }
        if (!response.ok || !payload?.ok || !payload.tags?.length) {
          throw new Error(payload?.error || "Mint fehlgeschlagen.");
        }

        const mintedUuids = payload.tags
          .map((tag) => tag.uuid)
          .filter((uuid) => isPlaqueTagUuid(uuid));
        setLastBatchUuids(mintedUuids);

        const rendered = await Promise.all(
          mintedUuids.map((uuid) => renderPlaque(nextOrigin, uuid, "minted")),
        );
        setPlaques((current) => [...rendered, ...current]);

        if (options?.downloadZip && mintedUuids.length > 0) {
          setZipPending(true);
          try {
            await downloadPlaqueZip(mintedUuids);
          } finally {
            setZipPending(false);
          }
        }
      } catch (mintError) {
        setError(
          mintError instanceof Error ? mintError.message : "Mint fehlgeschlagen.",
        );
      } finally {
        setLoading(false);
      }
    },
    [count],
  );

  const downloadLastBatchZip = useCallback(async () => {
    if (lastBatchUuids.length === 0) return;
    setZipPending(true);
    setError(null);
    try {
      await downloadPlaqueZip(lastBatchUuids);
    } catch (zipError) {
      setError(
        zipError instanceof Error
          ? zipError.message
          : "ZIP konnte nicht erstellt werden.",
      );
    } finally {
      setZipPending(false);
    }
  }, [lastBatchUuids]);

  useEffect(() => {
    void loadLatestUnclaimed();
  }, [loadLatestUnclaimed]);

  const isLocalhost =
    origin.includes("localhost") || origin.includes("127.0.0.1");
  const busy = loading || zipPending;

  return (
    <div className="flex w-full flex-col gap-5">
      {isLocalhost ? (
        <div className="rounded-2xl border border-amber-300/80 bg-amber-50 px-4 py-3 text-[0.82rem] leading-relaxed text-amber-950">
          Lokal verbunden. Für physische Plaques{" "}
          <span className="font-mono">https://app.zeloxtag.de/qr</span> nutzen —
          sonst zeigt der QR auf localhost.
        </div>
      ) : null}

      <div className="vd-tile px-4 py-3 text-[0.82rem] text-[color:var(--vd-muted)]">
        <p>
          Superuser-Minter. SVG ist für die Lasergravur, PNG nur zur Kontrolle.
          Scan-URL:{" "}
          <span className="font-mono text-[color:var(--vd-text)]">
            {origin || "…"}/v/…
          </span>
        </p>
        <p className="mt-1">
          Max. {MAX_MINT_BATCH} Tags pro Lauf. MFA + Operator-Mail erforderlich.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 text-[0.78rem] font-semibold text-[color:var(--vd-text)]">
            Anzahl
            <select
              value={count}
              disabled={busy}
              onChange={(event) =>
                setCount(
                  Number(event.target.value) as (typeof BATCH_OPTIONS)[number],
                )
              }
              className="h-10 rounded-xl border border-[color:var(--vd-border)] bg-white px-2.5 text-[0.82rem]"
            >
              {BATCH_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <PressableButton
            type="button"
            variant="button"
            disabled={busy}
            onClick={() => void mintBatch({ downloadZip: true })}
            className="claim-cta-sm disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {count === 1
              ? "Tag minten & ZIP"
              : `${count} Tags minten & ZIP`}
          </PressableButton>
          <PressableButton
            type="button"
            variant="button"
            disabled={busy}
            onClick={() => void mintBatch()}
            className="claim-back !w-auto px-3 py-2 text-[0.78rem] disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Nur minten
          </PressableButton>
          <PressableButton
            type="button"
            variant="button"
            disabled={busy}
            onClick={() => void loadLatestUnclaimed()}
            className="claim-back !w-auto px-3 py-2 text-[0.78rem] disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Nächsten Unclaimed laden
          </PressableButton>
        </div>
      </div>

      {error ? <p className="vd-alert-error">{error}</p> : null}

      {lastBatchUuids.length > 0 ? (
        <PressableButton
          type="button"
          variant="button"
          disabled={busy}
          onClick={() => void downloadLastBatchZip()}
          className="claim-back !w-auto px-4 py-3 text-[0.85rem]"
        >
          <Download className="h-4 w-4" aria-hidden />
          Letzte {lastBatchUuids.length} SVGs als ZIP
        </PressableButton>
      ) : null}

      <div className="grid gap-4">
        {plaques.map((plaque) => {
          const url = origin
            ? plaqueScanUrl(origin, plaque.uuid)
            : `/v/${plaque.uuid}`;
          return (
            <article key={plaque.uuid} className="vd-surface-card p-5 shadow-[var(--vd-shadow-sm)]">
              <p className="claim-kicker">
                {plaque.source === "minted" ? "Frisch gemintet" : "Unclaimed"}
              </p>
              <p className="mt-2 break-all font-mono text-[0.72rem] text-[color:var(--vd-muted)]">
                {url}
              </p>
              <p className="mt-1 break-all font-mono text-[0.68rem] text-[color:var(--vd-text)]">
                UUID: {plaque.uuid}
              </p>

              <div className="mt-4 flex justify-center rounded-2xl bg-white p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={plaque.png}
                  alt={`QR-Code für ${plaque.uuid}`}
                  width={240}
                  height={240}
                  className="h-auto w-[min(70vw,240px)]"
                />
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <PressableButton
                  type="button"
                  onClick={() =>
                    downloadTextFile(
                      plaque.svg,
                      plaqueSvgFilename(plaque.uuid),
                      "image/svg+xml",
                    )
                  }
                  className="claim-cta h-11"
                >
                  SVG speichern
                </PressableButton>
                <a
                  href={plaque.png}
                  download={plaquePngFilename(plaque.uuid)}
                  className="claim-back inline-flex h-11 items-center justify-center no-underline"
                >
                  PNG speichern
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
