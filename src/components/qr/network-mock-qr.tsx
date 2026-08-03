"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

import { MOCK_TAG_UUIDS } from "@/lib/tags/mock-tags";

type QrTarget = {
  id: string;
  label: string;
  description: string;
  path: string;
};

/**
 * Generates scannable QR codes from the current origin so phones on the same
 * LAN can open the Next.js app (use http://<lan-ip>:3000/qr — not localhost).
 * Unclaimed QR always points at the newest unclaimed tag from Supabase.
 */
export function NetworkMockQr() {
  const [origin, setOrigin] = useState<string>("");
  const [targets, setTargets] = useState<QrTarget[]>([]);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const nextOrigin = window.location.origin;
    setOrigin(nextOrigin);

    let cancelled = false;

    async function build() {
      try {
        let unclaimedUuid: string = MOCK_TAG_UUIDS.unclaimed;
        const response = await fetch("/api/tags/next-unclaimed");
        const payload = (await response.json().catch(() => null)) as {
          ok?: boolean;
          uuid?: string | null;
        } | null;
        if (payload?.ok && payload.uuid) {
          unclaimedUuid = payload.uuid;
        }

        const nextTargets: QrTarget[] = [
          {
            id: "unclaimed",
            label: "Nächster Unclaimed Tag",
            description: "Öffnet den Claim-Flow",
            path: `/v/${unclaimedUuid}`,
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

        if (!cancelled) {
          setTargets(nextTargets);
          setCodes(Object.fromEntries(entries));
          setError(null);
        }
      } catch (buildError) {
        if (!cancelled) {
          setError(
            buildError instanceof Error
              ? buildError.message
              : "QR-Code konnte nicht erzeugt werden.",
          );
        }
      }
    }

    void build();
    return () => {
      cancelled = true;
    };
  }, []);

  const isLocalhost =
    origin.includes("localhost") || origin.includes("127.0.0.1");

  return (
    <div className="flex w-full flex-col gap-5">
      {isLocalhost ? (
        <div className="rounded-2xl border border-amber-300/80 bg-amber-50 px-4 py-3 text-[0.82rem] leading-relaxed text-amber-950">
          Du bist über <span className="font-mono">localhost</span> verbunden.
          Öffne diese Seite auf dem Rechner stattdessen über deine LAN-IP, z. B.{" "}
          <span className="font-mono">http://192.168.x.x:3000/qr</span>, damit
          das Handy denselben Host erreichen kann.
        </div>
      ) : null}

      <div className="rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-4 py-3 text-[0.82rem] text-[color:var(--vd-muted)]">
        Aktuelle Basis-URL:{" "}
        <span className="font-mono text-[color:var(--vd-text)]">
          {origin || "…"}
        </span>
        <span className="mt-1 block">
          Nach jedem Claim erscheint hier automatisch der nächste unclaimed Tag.
        </span>
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
                    QR wird erzeugt…
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
