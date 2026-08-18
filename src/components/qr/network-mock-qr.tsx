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

const BATCH_OPTIONS = [1, 5, 10, 20] as const;

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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState<(typeof BATCH_OPTIONS)[number]>(1);

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

  const mintBatch = useCallback(async () => {
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

      const rendered = await Promise.all(
        payload.tags
          .filter((tag) => isPlaqueTagUuid(tag.uuid))
          .map((tag) => renderPlaque(nextOrigin, tag.uuid, "minted")),
      );
      setPlaques((current) => [...rendered, ...current]);
    } catch (mintError) {
      setError(
        mintError instanceof Error ? mintError.message : "Mint fehlgeschlagen.",
      );
    } finally {
      setLoading(false);
    }
  }, [count]);

  useEffect(() => {
    void loadLatestUnclaimed();
  }, [loadLatestUnclaimed]);

  const isLocalhost =
    origin.includes("localhost") || origin.includes("127.0.0.1");

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
              disabled={loading}
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
            disabled={loading}
            onClick={() => void mintBatch()}
            className="claim-cta-sm disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {count === 1 ? "Tag minten" : `${count} Tags minten`}
          </PressableButton>
          <PressableButton
            type="button"
            variant="button"
            disabled={loading}
            onClick={() => void loadLatestUnclaimed()}
            className="claim-back !w-auto px-3 py-2 text-[0.78rem] disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Nächsten Unclaimed laden
          </PressableButton>
        </div>
      </div>

      {error ? <p className="vd-alert-error">{error}</p> : null}

      {plaques.length > 1 ? (
        <PressableButton
          type="button"
          variant="button"
          disabled={loading}
          onClick={() => {
            plaques.forEach((plaque, index) => {
              window.setTimeout(() => {
                downloadTextFile(
                  plaque.svg,
                  plaqueSvgFilename(plaque.uuid),
                  "image/svg+xml",
                );
              }, index * 180);
            });
          }}
          className="claim-back !w-auto px-4 py-3 text-[0.85rem]"
        >
          <Download className="h-4 w-4" aria-hidden />
          Alle {plaques.length} SVGs speichern
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
