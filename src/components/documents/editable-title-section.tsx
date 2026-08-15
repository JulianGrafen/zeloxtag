"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Pencil } from "lucide-react";

import { updateDocumentFields } from "@/actions/update-document-fields";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { displayDocumentTitle } from "@/lib/documents/format";

type EditableTitleSectionProps = {
  documentId: string;
  vehicleId: string;
  tagUuid: string;
  title: string;
  onSaved?: (title: string) => void;
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
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setDisplayTitle(nextTitle);
      onSaved?.(nextTitle);
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <div className="min-w-0">
      {!editing ? (
        <div className="flex items-start gap-2">
          <h1 className="min-w-0 font-[family-name:var(--font-display)] text-[1.45rem] font-semibold leading-tight tracking-[-0.035em] text-[color:var(--vd-text)] sm:text-[1.65rem]">
            {displayTitle}
          </h1>
          <PressableButton
            type="button"
            variant="button"
            onClick={() => setEditing(true)}
            aria-label="Titel bearbeiten"
            className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] text-[color:var(--vd-text)]"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </PressableButton>
        </div>
      ) : (
        <div className="space-y-2">
          <Label>
            <span className="sr-only">Titel</span>
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="z. B. Bremsen Hinterachse"
              className="mt-0 text-[1.05rem] font-semibold"
              maxLength={160}
              autoFocus
            />
          </Label>
          <div className="flex flex-wrap gap-2">
            <PressableButton
              type="button"
              variant="button"
              disabled={pending}
              onClick={handleSave}
              className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-3.5 py-2 text-[0.8rem] font-semibold text-white"
            >
              {pending ? "Speichern…" : "Speichern"}
            </PressableButton>
            <PressableButton
              type="button"
              variant="button"
              disabled={pending}
              onClick={handleCancel}
              className="inline-flex items-center justify-center rounded-xl border border-[color:var(--vd-border)] px-3.5 py-2 text-[0.8rem] font-medium text-[color:var(--vd-text)]"
            >
              Abbrechen
            </PressableButton>
          </div>
        </div>
      )}

      {error ? (
        <p
          role="alert"
          className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-[0.78rem] text-red-700"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
