"use client";

import { ImageIcon, Link2, Loader2, TextIcon } from "lucide-react";
import { useRef, useState } from "react";

import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import type { PlannedModExtractResult } from "@/lib/build-planner/extract-schema";
import { parsePlannedModExtractResult } from "@/lib/build-planner/extract-schema";

type Tab = "link" | "image" | "text";

type BuildPlannerSmartInputProps = {
  vehicleId: string;
  aiUnlocked: boolean;
  onLocked: () => void;
  onExtract: (payload: {
    extract: PlannedModExtractResult;
    modelId: string;
    sourceKind: Tab;
    sourceUrl?: string;
  }) => void;
  onError: (message: string) => void;
};

export function BuildPlannerSmartInput({
  vehicleId,
  aiUnlocked,
  onLocked,
  onExtract,
  onError,
}: BuildPlannerSmartInputProps) {
  const [tab, setTab] = useState<Tab>("link");
  const [link, setLink] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function runExtract(body: FormData | Record<string, unknown>) {
    if (!aiUnlocked) {
      onLocked();
      return;
    }

    setLoading(true);
    onError("");

    try {
      const isForm = body instanceof FormData;
      const response = await fetch("/api/build-planner/extract", {
        method: "POST",
        credentials: "same-origin",
        ...(isForm
          ? { body }
          : {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }),
      });

      const json = (await response.json()) as {
        ok?: boolean;
        error?: string;
        extract?: unknown;
        modelId?: string;
        code?: string;
      };

      if (!response.ok || !json.ok || !json.extract) {
        onError(
          json.error ??
            "Extraktion fehlgeschlagen. Versuche Text oder Screenshot.",
        );
        return;
      }

      const parsed = parsePlannedModExtractResult(json.extract);
      if (!parsed) {
        onError("KI-Antwort ungültig.");
        return;
      }

      onExtract({
        extract: parsed,
        modelId: json.modelId ?? "unknown",
        sourceKind: tab,
        sourceUrl: tab === "link" ? link.trim() : undefined,
      });
    } catch {
      onError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] p-4 space-y-3">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
        Smart Input
      </p>

      <div className="flex gap-2">
        {(
          [
            { id: "link" as const, label: "Link", icon: Link2 },
            { id: "image" as const, label: "Foto", icon: ImageIcon },
            { id: "text" as const, label: "Text", icon: TextIcon },
          ] as const
        ).map((item) => (
          <PressableButton
            key={item.id}
            type="button"
            className={`flex-1 rounded-xl border px-2 py-2 text-[0.78rem] font-medium ${
              tab === item.id
                ? "border-[color:var(--vd-text)] text-[color:var(--vd-text)]"
                : "border-[color:var(--vd-border)] text-[color:var(--vd-muted)]"
            }`}
            onClick={() => setTab(item.id)}
          >
            <item.icon className="mx-auto mb-1 h-4 w-4" aria-hidden />
            {item.label}
          </PressableButton>
        ))}
      </div>

      {tab === "link" ? (
        <input
          type="url"
          inputMode="url"
          placeholder="https://shop.de/produkt…"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className="w-full rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-3 text-[0.9rem] text-[color:var(--vd-text)]"
        />
      ) : null}

      {tab === "text" ? (
        <textarea
          rows={4}
          placeholder="z. B. auf 400 PS bringen, KW V3, Shop-Link…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-3 text-[0.9rem] text-[color:var(--vd-text)]"
        />
      ) : null}

      {tab === "image" ? (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const form = new FormData();
              form.set("vehicleId", vehicleId);
              form.set("image", file);
              void runExtract(form);
              e.target.value = "";
            }}
          />
          <PressableButton
            type="button"
            className="w-full rounded-xl border border-dashed border-[color:var(--vd-border)] py-4 text-[0.85rem] font-medium text-[color:var(--vd-text)]"
            disabled={loading}
            onClick={() => fileRef.current?.click()}
          >
            Foto oder Screenshot wählen
          </PressableButton>
        </>
      ) : null}

      {tab !== "image" ? (
        <PressableButton
          type="button"
          disabled={loading}
          className="w-full rounded-xl bg-[color:var(--vd-text)] py-3 text-[0.9rem] font-semibold text-[color:var(--vd-bg)]"
          onClick={() => {
            if (tab === "link") {
              const url = link.trim();
              if (!url) {
                onError("Bitte einen Link eingeben.");
                return;
              }
              void runExtract({ vehicleId, sourceUrl: url });
              return;
            }
            const value = text.trim();
            if (value.length < 8) {
              onError("Bitte etwas mehr Kontext eingeben.");
              return;
            }
            void runExtract({ vehicleId, text: value });
          }}
        >
          {loading ? (
            <Loader2 className="mx-auto h-5 w-5 animate-spin" aria-hidden />
          ) : (
            "Mit KI analysieren"
          )}
        </PressableButton>
      ) : loading ? (
        <div className="flex justify-center py-2">
          <Loader2 className="h-5 w-5 animate-spin text-[color:var(--vd-muted)]" />
        </div>
      ) : null}

      {!aiUnlocked ? (
        <p className="text-[0.75rem] text-[color:var(--vd-muted)]">
          KI-Extraktion ist Teil von ZeloxTag Pro. Manuelles Planen bleibt
          kostenlos.
        </p>
      ) : null}
    </section>
  );
}
