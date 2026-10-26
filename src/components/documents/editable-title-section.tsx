"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Pencil, Type } from "lucide-react";

import { updateDocumentFields } from "@/actions/update-document-fields";
import { isActionFailure } from "@/lib/permissions/feature-gate-result";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdaptiveDocumentDetailTitle } from "@/components/documents/adaptive-document-detail-title";
import { displayDocumentTitle } from "@/lib/documents/format";
import type { InvoiceDetailEditTarget } from "@/lib/documents/invoice-detail-edit";
import {
  EditableInsetRowShell,
  InsetEditorButton,
  type EditableSectionLayout,
} from "@/components/documents/editable-inset-row-shell";
import { showSavedToast } from "@/lib/ui/saved-toast";

const EDIT_TARGET: InvoiceDetailEditTarget = "title";

type EditableTitleSectionProps = {
  documentId: string;
  vehicleId: string;
  tagUuid: string;
  title: string;
  onSaved?: (title: string) => void;
  hideEditTrigger?: boolean;
  editRequest?: InvoiceDetailEditTarget | null;
  editPulse?: number;
  onEditRequestConsumed?: () => void;
  sectionId?: string;
  layout?: EditableSectionLayout;
};

/**
 * Owner (or Schrauber on invoices): edit the stored invoice title after upload.
 */
export function EditableTitleSection({
  documentId,
  vehicleId,
  tagUuid,
  title,
  onSaved,
  hideEditTrigger = false,
  editRequest = null,
  editPulse = 0,
  onEditRequestConsumed,
  sectionId,
  layout = "default",
}: EditableTitleSectionProps) {
  const router = useRouter();
  const storedTitle = displayDocumentTitle(title);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(storedTitle);
  const [displayTitle, setDisplayTitle] = useState(storedTitle);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!editing) {
      setDisplayTitle(storedTitle);
      setDraft(storedTitle);
    }
  }, [storedTitle, editing]);

  useEffect(() => {
    if (editRequest !== EDIT_TARGET || editPulse === 0) return;
    setError(null);
    setEditing(true);
    onEditRequestConsumed?.();
  }, [editRequest, editPulse, onEditRequestConsumed]);

  function handleCancel() {
    setDraft(storedTitle);
    setError(null);
    setEditing(false);
  }

  function handleSave() {
    setError(null);
    const nextTitle = draft.trim();
    if (!nextTitle) {
      setError("Titel ist erforderlich.");
      return;
    }
    startTransition(async () => {
      const result = await updateDocumentFields({
        documentId,
        vehicleId,
        tagUuid,
        title: nextTitle,
      });
      if (isActionFailure(result)) {
        setError(result.message);
        return;
      }
      showSavedToast();
      setDisplayTitle(nextTitle);
      onSaved?.(nextTitle);
      setEditing(false);
      router.refresh();
    });
  }

  if (layout === "inset-row") {
    return (
      <EditableInsetRowShell
        sectionId={sectionId}
        label="Bezeichnung"
        icon={Type}
        iconTone="neutral"
        value={displayTitle}
        editing={editing}
        pending={pending}
        error={error}
        onEdit={hideEditTrigger ? undefined : () => setEditing(true)}
        onSave={handleSave}
        onCancel={handleCancel}
        editor={
          <Input
            aria-label="Bezeichnung"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="z. B. Bremsen Hinterachse"
            maxLength={160}
            autoFocus
          />
        }
      />
    );
  }

  return (
    <div id={sectionId} className="min-w-0 scroll-mt-24">
      {!editing ? (
        <div className="flex items-start gap-2">
          <AdaptiveDocumentDetailTitle hasTrailingAside>
            {displayTitle}
          </AdaptiveDocumentDetailTitle>
          {!hideEditTrigger ? (
            <PressableButton
              type="button"
              variant="button"
              onClick={() => setEditing(true)}
              aria-label="Titel bearbeiten"
              className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-white"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
            </PressableButton>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2">
          <Label>
            <span className="sr-only">Titel</span>
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="z. B. Bremsen Hinterachse"
              className="mt-0 bg-[#2C2C2E] text-[1.05rem] font-semibold text-white"
              maxLength={160}
              autoFocus
            />
          </Label>
          <div className="flex gap-2">
            <InsetEditorButton tone="primary" disabled={pending} onClick={handleSave}>
              {pending ? "Speichern…" : "Speichern"}
            </InsetEditorButton>
            <InsetEditorButton tone="secondary" disabled={pending} onClick={handleCancel}>
              Abbrechen
            </InsetEditorButton>
          </div>
        </div>
      )}

      {error ? (
        <p
          role="alert"
          className="mt-2 text-xs text-[#FF453A]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
