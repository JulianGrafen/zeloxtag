"use client";

import { AlertTriangle } from "lucide-react";

import { AbeFieldLabel, AbeKbaHero } from "@/components/documents/abe-review-ui";
import { Input } from "@/components/ui/input";
import {
  ABE_VISION_CONFIDENCE_WARNING_THRESHOLD,
  parseAuflagenCodeInput,
  type AbeExtractionFormValues,
} from "@/lib/validations/abeVisionExtractionSchemas";
import { normalizeAuflagenKuerzel } from "@/lib/ocr/auflagen-kuerzel-db";

export type AbeExtractionFieldsFormProps = {
  values: AbeExtractionFormValues;
  onChange: (next: AbeExtractionFormValues) => void;
  mode: "review" | "manual";
  confidenceScore?: number | null;
  auflagenCatalog: Map<string, string>;
};

function AuflagenCatalogBadges({
  codes,
  catalog,
}: {
  codes: string[];
  catalog: Map<string, string>;
}) {
  if (codes.length === 0) {
    return (
      <p className="text-[0.78rem] text-[color:var(--vd-muted)]">
        Noch keine Auflagen-Kürzel erkannt.
      </p>
    );
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {codes.map((code) => {
        const key = normalizeAuflagenKuerzel(code);
        const catalogText = catalog.get(key);
        const known = Boolean(catalogText);

        return (
          <li key={code}>
            <span
              className={[
                "inline-flex max-w-full flex-col rounded-full border px-3 py-1.5 text-left",
                known
                  ? "border-emerald-400/60 bg-emerald-50 text-emerald-950"
                  : "border-amber-300/70 bg-amber-50 text-amber-950",
              ].join(" ")}
            >
              <span className="font-mono text-[0.78rem] font-semibold tracking-wide">
                {key}
              </span>
              {catalogText ? (
                <span className="mt-0.5 line-clamp-2 text-[0.68rem] leading-snug opacity-90">
                  {catalogText}
                </span>
              ) : (
                <span className="mt-0.5 text-[0.68rem] opacity-80">
                  Nicht im Kürzel-Katalog
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Shared review + manual fallback form for ABE vision extraction.
 * Used for both AI review and seamless manual entry when extraction is empty.
 */
export function AbeExtractionFieldsForm({
  values,
  onChange,
  mode,
  confidenceScore = null,
  auflagenCatalog,
}: AbeExtractionFieldsFormProps) {
  const parsedCodes = parseAuflagenCodeInput(values.auflagenCodes);
  const showLowConfidence =
    mode === "review" &&
    confidenceScore !== null &&
    confidenceScore < ABE_VISION_CONFIDENCE_WARNING_THRESHOLD;

  return (
    <div className="space-y-4">
      {mode === "manual" ? (
        <div
          role="status"
          className="rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-3 py-2.5 text-[0.82rem] text-[color:var(--vd-text)]"
        >
          Wir konnten die Daten nicht automatisch lesen. Bitte tippe die
          5-stellige KBA-Nummer (steht meist oben rechts) hier ein.
        </div>
      ) : null}

      {showLowConfidence ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-2.5 text-[0.78rem] text-amber-950">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            Das Dokument war schwer lesbar (Vertrauen{" "}
            {confidenceScore}
            %). Bitte überprüfe die KBA-Nummer kurz.
          </p>
        </div>
      ) : null}

      <AbeKbaHero
        value={values.kbaNumber}
        isEditing
        placeholder="z. B. 48571"
        onChange={(event) =>
          onChange({ ...values, kbaNumber: event.target.value })
        }
      />

      <AbeFieldLabel label="Bauteil / Prüfgegenstand">
        <Input
          value={values.partType}
          onChange={(event) =>
            onChange({ ...values, partType: event.target.value })
          }
          placeholder="z. B. Felge, Fahrwerk, Spoiler"
        />
      </AbeFieldLabel>

      <AbeFieldLabel label="Auflagen-Kürzel">
        <Input
          value={values.auflagenCodes}
          onChange={(event) =>
            onChange({ ...values, auflagenCodes: event.target.value })
          }
          className="font-mono"
          placeholder="z. B. A01 K2b"
        />
      </AbeFieldLabel>

      <div className="rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-3 py-3">
        <p className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
          Kürzel-Katalog
        </p>
        <div className="mt-2">
          <AuflagenCatalogBadges codes={parsedCodes} catalog={auflagenCatalog} />
        </div>
      </div>
    </div>
  );
}

export function isAbeExtractionFormValid(values: AbeExtractionFormValues): boolean {
  return values.kbaNumber.replace(/\D/g, "").length >= 4;
}
