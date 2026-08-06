import {
  APPROVAL_KIND_LABELS,
  type ApprovalFields,
} from "@/lib/documents/approval-fields";
import { formatDocumentDate } from "@/lib/documents/format";

const TUEV_RESULT_LABELS: Record<string, string> = {
  no_defects: "Ohne Mängel",
  minor_defects: "Geringe Mängel",
  major_defects: "Erhebliche Mängel",
  dangerous_defects: "Gefährliche Mängel",
  failed: "Nicht bestanden",
};

function Fact({
  label,
  value,
}: {
  label: string;
  value: string | number | boolean | null | undefined;
}) {
  if (value === null || value === undefined || value === "") return null;
  const display =
    typeof value === "boolean" ? (value ? "Ja" : "Nein") : String(value);
  return (
    <div className="rounded-xl bg-[color:var(--vd-surface-elevated)] p-3">
      <dt className="text-[0.7rem] text-[color:var(--vd-muted)]">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]">
        {display}
      </dd>
    </div>
  );
}

/**
 * Kind-specific extracted fields for ABE subtypes / TÜV reports.
 */
export function ApprovalFieldsSection({
  approvalFields,
}: {
  approvalFields: ApprovalFields | null | undefined;
}) {
  if (!approvalFields || approvalFields.kind === "abe") {
    return null;
  }

  const title = APPROVAL_KIND_LABELS[approvalFields.kind];

  return (
    <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]">
      <h2 className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
        Extrahierte Felder · {title}
      </h2>

      {approvalFields.kind === "teilegutachten" ? (
        <dl className="grid grid-cols-1 gap-3 text-[0.85rem] sm:grid-cols-2">
          <Fact
            label="Prüforganisation"
            value={approvalFields.data.testingOrganization}
          />
          <Fact
            label="Teilegutachten-Nr."
            value={approvalFields.data.documentNumber}
          />
          <div className="sm:col-span-2">
            <Fact
              label="Verwendungsbereich"
              value={approvalFields.data.validityArea}
            />
          </div>
          <Fact
            label="Sofortige Abnahme erforderlich"
            value={approvalFields.data.immediateInspectionRequired}
          />
        </dl>
      ) : null}

      {approvalFields.kind === "einzelabnahme" ? (
        <dl className="grid grid-cols-1 gap-3 text-[0.85rem] sm:grid-cols-2">
          <Fact
            label="Dokumentnummer"
            value={approvalFields.data.reportNumber}
          />
          <Fact
            label="Amtlich anerkannter Sachverständiger"
            value={approvalFields.data.officialExpert}
          />
          <div className="sm:col-span-2">
            <Fact
              label="Feld 22 · Bemerkungen / Änderungen"
              value={approvalFields.data.field22Text}
            />
          </div>
        </dl>
      ) : null}

      {approvalFields.kind === "egbe" ? (
        <dl className="grid grid-cols-1 gap-3 text-[0.85rem] sm:grid-cols-2">
          <Fact label="E-Prüfzeichen" value={approvalFields.data.eMark} />
          <Fact
            label="Bauteilgruppe"
            value={approvalFields.data.componentGroup}
          />
        </dl>
      ) : null}

      {approvalFields.kind === "tuev" ? (
        <>
          <dl className="grid grid-cols-1 gap-3 text-[0.85rem] sm:grid-cols-2">
            <Fact
              label="Prüforganisation"
              value={approvalFields.data.testingOrganization}
            />
            <Fact
              label="Ergebnis"
              value={
                TUEV_RESULT_LABELS[approvalFields.data.result] ??
                approvalFields.data.result
              }
            />
            <Fact
              label="Prüfdatum"
              value={
                approvalFields.data.testDate
                  ? formatDocumentDate(approvalFields.data.testDate)
                  : null
              }
            />
            <Fact
              label="Nächste HU"
              value={approvalFields.data.nextInspectionDate}
            />
            <Fact
              label="Kilometerstand"
              value={
                typeof approvalFields.data.mileageKm === "number"
                  ? `${approvalFields.data.mileageKm.toLocaleString("de-DE")} km`
                  : null
              }
            />
            <Fact
              label="Vorgangsnummer"
              value={approvalFields.data.documentNumber}
            />
          </dl>
          {approvalFields.data.defectsList?.length ? (
            <div className="mt-4">
              <p className="mb-2 text-[0.7rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
                Festgestellte Mängel
              </p>
              <ol className="space-y-2">
                {approvalFields.data.defectsList.map((defect, index) => (
                  <li
                    key={`${index}-${defect.slice(0, 32)}`}
                    className="flex gap-3 rounded-xl bg-[color:var(--vd-surface-elevated)] p-3 text-[0.88rem]"
                  >
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[0.7rem] font-semibold text-white">
                      {index + 1}
                    </span>
                    <span className="pt-0.5 leading-relaxed text-[color:var(--vd-text)]">
                      {defect}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
