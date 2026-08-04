"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { RefreshCw, Sparkles } from "lucide-react";

import { MOCK_TAG_UUIDS } from "@/lib/tags/mock-tags";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";

type QrSource = "supabase" | "minted" | "mock" | "empty-fallback-mock";

type QrTarget = {
  id: string;
  label: string;
  description: string;
  path: string;
  source?: QrSource;
};

function resolvePublicOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (typeof window === "undefined") {
    return configured || "";
  }
  // Prefer explicit production URL when set (custom domain / Vercel).
  // Fall back to the host that serves this page.
  if (configured && !configured.includes("localhost")) {
    return configured;
  }
  return window.location.origin;
}

/**
 * Online QR generator for Vercel / production.
 * Unclaimed QR always targets the newest (or freshly minted) Supabase tag.
 */
export function NetworkMockQr() {
  const [origin, setOrigin] = useState<string>("");
  const [targets, setTargets] = useState<QrTarget[]>([]);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [source, setSource] = useState<QrSource | null>(null);
  const [loading, setLoading] = useState(true);

  const build = useCallback(async (opts?: { mint?: boolean }) => {
    const nextOrigin = resolvePublicOrigin();
    setOrigin(nextOrigin);
    setLoading(true);
    setError(null);

    try {
      let unclaimedUuid: string = MOCK_TAG_UUIDS.unclaimed;
      let nextSource: QrSource = "mock";
      let nextWarning: string | null = null;

      try {
        const endpoint = opts?.mint
          ? "/api/tags/next-unclaimed?mint=1"
          : "/api/tags/next-unclaimed";
        const response = await fetch(endpoint, { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as {
          ok?: boolean;
          uuid?: string | null;
          source?: QrSource;
          warning?: string;
        } | null;

        if (payload?.ok && typeof payload.uuid === "string" && payload.uuid) {
          unclaimedUuid = payload.uuid;
          nextSource = payload.source ?? "supabase";
          nextWarning = payload.warning ?? null;
        }
      } catch {
        nextWarning = "API nicht erreichbar — Demo-UUID.";
      }

      const nextTargets: QrTarget[] = [
        {
          id: "unclaimed",
          label: "Nächster Unclaimed Tag",
          description: "Claim-Flow · online (Vercel)",
          path: `/v/${unclaimedUuid}`,
          source: nextSource,
        },
        {
          id: "active",
          label: "Demo Active Tag",
          description: "Öffnet das Fahrzeug-Dashboard",
          path: `/v/${MOCK_TAG_UUIDS.active}`,
        },
      ];

      const entries = await Promise.all(
        nextTargets.map(async (target) => {
          const url = `${nextOrigin}${target.path}`;
          const dataUrl = await QRCode.toDataURL(url, {
            width: 512,
            margin: 2,
            errorCorrectionLevel: "M",
            color: { dark: "#0a0a0a", light: "#ffffff" },
          });
          return [target.id, dataUrl] as const;
        }),
      );

      setTargets(nextTargets);
      setCodes(Object.fromEntries(entries));
      setSource(nextSource);
      setWarning(nextWarning);
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

  useEffect(() => {
    void build();
  }, [build]);

  const isLocalhost =
    origin.includes("localhost") || origin.includes("127.0.0.1");
  const isVercelHost =
    origin.includes("vercel.app") ||
    Boolean(
      process.env.NEXT_PUBLIC_SITE_URL &&
        !process.env.NEXT_PUBLIC_SITE_URL.includes("localhost"),
    );

  return (
    <div className="flex w-full flex-col gap-5">
      {isLocalhost ? (
        <div className="rounded-2xl border border-amber-300/80 bg-amber-50 px-4 py-3 text-[0.82rem] leading-relaxed text-amber-950">
          Lokal verbunden. Für echte Online-QR{" "}
          <span className="font-semibold">NEXT_PUBLIC_SITE_URL</span> auf deine
          Vercel-Domain setzen (z. B.{" "}
          <span className="font-mono">https://zeloxtag.vercel.app</span>) oder
          die deployte{" "}
          <span className="font-mono">/qr</span>-Seite öffnen.
        </div>
      ) : null}

      <div className="rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-4 py-3 text-[0.82rem] text-[color:var(--vd-muted)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p>
            Basis-URL:{" "}
            <span className="font-mono text-[color:var(--vd-text)]">
              {origin || "…"}
            </span>
          </p>
          {isVercelHost || (!isLocalhost && origin) ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-emerald-700">
              Online
            </span>
          ) : null}
        </div>
        <p className="mt-1">
          Unclaimed-QR zeigt den nächsten freien Tag aus Supabase. Nach einem
          Claim neu laden oder einen frischen Tag minten.
        </p>
        {source ? (
          <p className="mt-1 font-mono text-[0.72rem] text-[color:var(--vd-text)]">
            Quelle: {source}
          </p>
        ) : null}
        {warning ? (
          <p className="mt-2 text-[0.78rem] text-amber-800">{warning}</p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          <PressableButton
            type="button"
            variant="button"
            disabled={loading}
            onClick={() => void build()}
            className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--vd-border)] bg-white px-3 py-2 text-[0.78rem] font-semibold text-[color:var(--vd-text)] disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Aktualisieren
          </PressableButton>
          <PressableButton
            type="button"
            variant="button"
            disabled={loading}
            onClick={() => void build({ mint: true })}
            className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-3 py-2 text-[0.78rem] font-semibold text-white disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Neuen Tag minten
          </PressableButton>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-[0.8rem] text-red-700">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4">
        {targets.map((target) => {
          const url = origin ? `${origin}${target.path}` : target.path;
          const dataUrl = codes[target.id];
          return (
            <article
              key={target.id}
              className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow-sm)]"
            >
              <p className="text-[0.65rem] font-medium uppercase tracking-[0.18em] text-[color:var(--vd-muted)]">
                {target.label}
              </p>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-[1.15rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
                {target.description}
              </h2>
              <p className="mt-2 break-all font-mono text-[0.72rem] text-[color:var(--vd-muted)]">
                {url}
              </p>

              <div className="mt-4 flex justify-center rounded-2xl bg-white p-4">
                {dataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={dataUrl}
                    alt={`QR-Code für ${target.label}`}
                    width={240}
                    height={240}
                    className="h-auto w-[min(70vw,240px)]"
                  />
                ) : (
                  <div className="flex h-[240px] w-[240px] items-center justify-center text-[0.8rem] text-[color:var(--vd-muted)]">
                    {loading ? "QR wird erzeugt…" : "—"}
                  </div>
                )}
              </div>

              {dataUrl ? (
                <a
                  href={dataUrl}
                  download={`zeloxtag-${target.id}.png`}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-[color:var(--vd-border)] bg-white px-4 py-3 text-[0.85rem] font-semibold text-[color:var(--vd-text)]"
                >
                  PNG speichern
                </a>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
