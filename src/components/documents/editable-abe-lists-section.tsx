"use client";

import { useState, useTransition } from "react";
import { Pencil, ShieldCheck } from "lucide-react";

import { updateDocumentFields } from "@/actions/update-document-fields";
import {
  displaySpecForAbeDetailView,
  vehicleApprovalsForAbeDetailView,
} from "@/lib/documents/abe-detail-display";
import { CollapsibleAuflagenList } from "@/components/documents/collapsible-auflagen-list";
import { isIvStructuredAuflagen } from "@/lib/validations/teilegutachten-auflagen";
import { VerwendungsbereichTable } from "@/components/documents/verwendungsbereich-table";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import type { TableData } from "@/lib/validations/abeSchema";
import type { DocumentTechnicalSpec } from "@/types/database";

type EditableAbeListsSectionProps = {
  documentId: string;
  vehicleId: string;
  tagUuid: string;
  vehicleApprovals: string[];
  technicalSpecs: DocumentTechnicalSpec[];
  conditions: string[];
  notes?: string | null;
  /** Teilegutachten Verwendungsbereich table — replaces list when present. */
  compatibilityTable?: TableData | null;
  /** Teilegutachten Technische Daten table — replaces Maße list when present. */
  technicalDataTable?: TableData | null;
  /** Teilegutachten section III — Hinweise für den Fahrzeughalter. */
  ownerNotes?: string | null;
  /** ABE `verkaufsbezeichnung` — used to dedupe Freigabe list vs. Fahrzeugmodell. */
  verkaufsbezeichnung?: string | null;
};

function specsToText(specs: DocumentTechnicalSpec[]): string {
  return specs.map((spec) => `${spec.label}: ${spec.value}`).join("\n");
}

function textToSpecs(raw: string): DocumentTechnicalSpec[] {
  const out: DocumentTechnicalSpec[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const colon = trimmed.indexOf(":");
    if (colon <= 0) {
      out.push({ label: "Maß", value: trimmed.slice(0, 800) });
    } else {
      out.push({
        label: trimmed.slice(0, colon).trim().slice(0, 80) || "Maß",
        value: trimmed.slice(colon + 1).trim().slice(0, 800),
      });
    }
    if (out.length >= 40) break;
  }
  return out;
}

function textToLines(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.slice(0, 2400))
    .slice(0, 40);
}

/**
 * ABE Freigaben / Maße / Auflagen — editable only after „Bearbeiten“.
 */
export function EditableAbeListsSection({
  documentId,
  vehicleId,
  tagUuid,
  vehicleApprovals,
  technicalSpecs,
  conditions,
  notes,
  compatibilityTable = null,
  technicalDataTable = null,
  ownerNotes = null,
  verkaufsbezeichnung = null,
}: EditableAbeListsSectionProps) {
  const [editing, setEditing] = useState(false);
  const [approvalsText, setApprovalsText] = useState(
    vehicleApprovals.join("\n"),
  );
  const [specsText, setSpecsText] = useState(specsToText(technicalSpecs));
  const [conditionsText, setConditionsText] = useState(conditions.join("\n"));
  const [displayApprovals, setDisplayApprovals] = useState(vehicleApprovals);
  const [displaySpecs, setDisplaySpecs] = useState(technicalSpecs);
  const [displayConditions, setDisplayConditions] = useState(conditions);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const visibleApprovals = verkaufsbezeichnung
    ? vehicleApprovalsForAbeDetailView(displayApprovals, {
        technicalSpecs: displaySpecs,
        verkaufsbezeichnung,
      })
    : displayApprovals;
  const visibleSpecs = displaySpecs.map(displaySpecForAbeDetailView);

  function startEdit() {
    setError(null);
    setApprovalsText(displayApprovals.join("\n"));
    setSpecsText(specsToText(displaySpecs));
    setConditionsText(displayConditions.join("\n"));
    setEditing(true);
  }

  function cancelEdit() {
    setError(null);
    setEditing(false);
  }

  function commit() {
    const nextApprovals = textToLines(approvalsText).map((line) =>
      line.slice(0, 120),
    );
    const nextSpecs = textToSpecs(specsText);
    const nextConditions = textToLines(conditionsText);

    startTransition(async () => {
      const result = await updateDocumentFields({
        documentId,
        vehicleId,
        tagUuid,
        vehicleApprovals: nextApprovals,
        technicalSpecs: nextSpecs,
        conditions: nextConditions,
      });
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setDisplayApprovals(nextApprovals);
      setDisplaySpecs(nextSpecs);
      setDisplayConditions(nextConditions);
      setEditing(false);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {!editing ? (
          <PressableButton
            type="button"
            variant="button"
            onClick={startEdit}
            className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-1.5 text-[0.72rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            Bearbeiten
          </PressableButton>
        ) : null}
      </div>

      <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]">
        <h2 className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
          Freigabe
        </h2>
        {editing ? (
          <textarea
            value={approvalsText}
            onChange={(event) => setApprovalsText(event.target.value)}
            rows={Math.min(6, Math.max(3, displayApprovals.length || 3))}
            placeholder="Ein Fahrzeug / Variante pro Zeile"
            className="w-full rounded-xl border border-[color:var(--vd-border)] bg-white px-3 py-2.5 text-[0.88rem] leading-relaxed text-[color:var(--vd-text)] outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/15"
          />
        ) : compatibilityTable?.rows.length ? (
          <VerwendungsbereichTable table={compatibilityTable} />
        ) : visibleApprovals.length === 0 ? (
          <p className="text-[0.88rem] text-[color:var(--vd-muted)]">
            Keine Fahrzeugfreigaben erkannt.
          </p>
        ) : (
          <ul className="space-y-2">
            {visibleApprovals.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-[0.88rem] font-medium text-[color:var(--vd-text)]"
              >
                <ShieldCheck
                  className="h-4 w-4 shrink-0 text-emerald-600"
                  aria-hidden
                />
                {item}
              </li>
            ))}
          </ul>
        )}
        {!editing && notes ? (
          <p className="mt-3 text-[0.82rem] leading-relaxed text-[color:var(--vd-muted)]">
            {notes}
          </p>
        ) : null}
      </section>

      <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]">
        <h2 className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
          Technische Daten
        </h2>
        {editing ? (
          <textarea
            value={specsText}
            onChange={(event) => setSpecsText(event.target.value)}
            rows={Math.min(8, Math.max(3, displaySpecs.length || 3))}
            placeholder={"Bezeichnung: Wert\nEinpresstiefe (ET): 35 mm"}
            className="w-full rounded-xl border border-[color:var(--vd-border)] bg-white px-3 py-2.5 font-mono text-[0.82rem] leading-relaxed text-[color:var(--vd-text)] outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/15"
          />
        ) : technicalDataTable?.rows.length ? (
          <VerwendungsbereichTable
            table={technicalDataTable}
            highlightMatches={false}
          />
        ) : visibleSpecs.length === 0 ? (
          <p className="text-[0.88rem] text-[color:var(--vd-muted)]">
            Keine technischen Daten erkannt.
          </p>
        ) : (
          <dl className="grid gap-2.5 text-[0.88rem]">
            {visibleSpecs.map((spec, index) => (
              <div
                key={`${spec.label}-${index}`}
                className="flex items-start justify-between gap-3 rounded-xl bg-[color:var(--vd-surface-elevated)] p-3"
              >
                <dt className="text-[color:var(--vd-muted)]">{spec.label}</dt>
                <dd className="min-w-0 flex-1 text-right font-semibold tracking-[-0.02em] whitespace-pre-wrap text-[color:var(--vd-text)]">
                  {spec.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {ownerNotes ? (
        <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]">
          <h2 className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
            Hinweise für den Fahrzeughalter
          </h2>
          <p className="whitespace-pre-wrap text-[0.88rem] leading-relaxed text-[color:var(--vd-text)]">
            {ownerNotes}
          </p>
        </section>
      ) : null}

      <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]">
        <h2 className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
          {isIvStructuredAuflagen(displayConditions)
            ? "Hinweise und Auflagen (IV.)"
            : "Auflagen"}
        </h2>
        {editing ? (
          <textarea
            value={conditionsText}
            onChange={(event) => setConditionsText(event.target.value)}
            rows={Math.min(8, Math.max(3, displayConditions.length || 3))}
            placeholder="Eine vollständige Auflage pro Abschnitt"
            className="w-full rounded-xl border border-[color:var(--vd-border)] bg-white px-3 py-2.5 text-[0.88rem] leading-relaxed text-[color:var(--vd-text)] outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/15"
          />
        ) : (
          <CollapsibleAuflagenList conditions={displayConditions} />
        )}
      </section>

      {editing ? (
        <div className="space-y-2">
          {error ? (
            <p className="text-[0.82rem] text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <PressableButton
              type="button"
              variant="button"
              disabled={pending}
              onClick={cancelEdit}
              className="inline-flex flex-1 items-center justify-center rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2.5 text-[0.85rem] font-medium text-[color:var(--vd-text)]"
            >
              Abbrechen
            </PressableButton>
            <PressableButton
              type="button"
              variant="button"
              disabled={pending}
              onClick={commit}
              className="inline-flex flex-1 items-center justify-center rounded-2xl bg-neutral-900 px-3 py-2.5 text-[0.85rem] font-semibold text-white disabled:opacity-60"
            >
              {pending ? "Speichern…" : "Übernehmen"}
            </PressableButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
