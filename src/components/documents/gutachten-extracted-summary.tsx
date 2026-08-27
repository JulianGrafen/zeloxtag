import { CheckCircle2 } from "lucide-react";

import {
  GUTACHTEN_SUBTYPE_LABELS,
  type GutachtenExtraction,
} from "@/lib/validations/gutachtenSchema";
import { formatCompactGermanDate } from "@/lib/documents/format";

function formatDate(iso?: string): string | null {
  if (!iso?.trim()) return null;
  const compact = formatCompactGermanDate(iso.trim());
  return compact || iso.trim();
}

type SummaryItem = {
  label: string;
  value: string;
};

function buildSummaryItems(extraction: GutachtenExtraction): SummaryItem[] {
  const items: SummaryItem[] = [];

  const push = (label: string, value?: string | null) => {
    const trimmed = value?.trim();
    if (trimmed) items.push({ label, value: trimmed });
  };

  push("Bauteil", extraction.partName);
  push("Umrüstung", extraction.modificationType);
  push("Hersteller", extraction.manufacturer);
  push("KBA-Nr.", extraction.kbaNumber);
  push("Gutachten-Nr.", extraction.certificateNumber);
  push("Prüforganisation", extraction.testOrganization);
  push("Datum", formatDate(extraction.issueDate));

  if (extraction.markingType || extraction.markingNumber) {
    push(
      "Kennzeichnung",
      [extraction.markingType, extraction.markingNumber]
        .filter(Boolean)
        .join(" · "),
    );
  }

  push("Fahrzeug", extraction.matchedVehicleRow ?? extraction.vehicleMatchNotes);
  push("VIN", extraction.vin);

  if (extraction.conditions?.length) {
    push(
      "Auflagen",
      `${extraction.conditions.length} Punkt(e) erkannt`,
    );
  }

  if (extraction.modificationsField22) {
    const preview = extraction.modificationsField22.trim().slice(0, 120);
    push(
      "Feld 22",
      preview.length < extraction.modificationsField22.trim().length
        ? `${preview}…`
        : preview,
    );
  }

  return items;
}

export function GutachtenExtractedSummary({
  extraction,
  compact = false,
}: {
  extraction: GutachtenExtraction;
  compact?: boolean;
}) {
  const items = buildSummaryItems(extraction);
  if (items.length === 0) return null;

  return (
    <div
      className={[
        "rounded-[1.15rem] border border-emerald-200 bg-emerald-50/90 text-emerald-950",
        compact ? "px-3 py-2.5" : "p-4",
      ].join(" ")}
    >
      <div className="flex items-start gap-2">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-[0.78rem] font-semibold uppercase tracking-[0.12em]">
            Titelseite ausgelesen ·{" "}
            {GUTACHTEN_SUBTYPE_LABELS[extraction.documentSubtype]}
          </p>
          <dl
            className={[
              "grid gap-1.5",
              compact ? "text-[0.76rem]" : "text-[0.82rem]",
            ].join(" ")}
          >
            {items.map((item) => (
              <div key={item.label} className="grid grid-cols-[7.5rem_1fr] gap-2">
                <dt className="text-emerald-800/75">{item.label}</dt>
                <dd className="font-medium leading-snug">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
