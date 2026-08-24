"use client";

import {
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  CloudUpload,
  LoaderCircle,
  Save,
} from "lucide-react";

import { DocumentUpload } from "@/components/dashboard/DocumentUpload";
import { PressableLink } from "@/components/vehicle-dashboard/Pressable";
import { Button } from "@/components/ui/button";
import {
  saveVaultDocument,
  stageVaultDocument,
} from "@/lib/documents/vault-document";
import { convertImagesToPdf } from "@/lib/utils/pdf-converter";
import {
  VAULT_CATEGORIES,
  VAULT_CATEGORY_LABELS,
  type VaultCategory,
  type VaultClassification,
} from "@/lib/validations/vaultClassificationSchema";

type VaultPhase =
  | "idle"
  | "uploading"
  | "analyzing"
  | "review"
  | "saving"
  | "success";

export interface DocumentVaultUploadProps {
  vehicleId: string;
  tagUuid: string;
  vehicleLabel: string;
  successHref?: string;
  onBack?: () => void;
  backHref?: string;
  backLabel?: string;
}

const ACCEPTED_MIME = "image/*,application/pdf,.pdf";

function isPdf(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

async function toUploadPdf(file: File): Promise<File> {
  if (isPdf(file)) return file;
  const result = await convertImagesToPdf([file], {
    fileName: `vault-upload-${Date.now()}`,
    fullBleed: true,
    imageCompression: "MEDIUM",
  });
  return result.file;
}

async function classifyVaultDocument(
  file: File,
  vehicleId: string,
): Promise<VaultClassification | null> {
  const formData = new FormData();
  formData.set("vehicleId", vehicleId);
  formData.set("file", file);

  try {
    const response = await fetch("/api/ocr/vault-classify", {
      method: "POST",
      body: formData,
    });
    const payload = (await response.json().catch(() => null)) as
      | { ok: true; classification: VaultClassification }
      | { ok: false; error?: string }
      | null;

    if (!response.ok || !payload || payload.ok !== true) {
      return null;
    }
    return payload.classification;
  } catch {
    return null;
  }
}

export function DocumentVaultUpload({
  vehicleId,
  tagUuid,
  vehicleLabel,
  successHref,
  onBack,
  backHref,
  backLabel = "Zurück",
}: DocumentVaultUploadProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<VaultPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<VaultCategory>("SONSTIGES");
  const [stagedDocumentId, setStagedDocumentId] = useState<string | null>(null);
  const [stagedFileUrl, setStagedFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const resolvedBackHref = backHref ?? `/v/${tagUuid}/dokumente?type=abe`;
  const resolvedSuccessHref =
    successHref ?? `/v/${tagUuid}/dokumente?type=abe`;

  function reset() {
    setPhase("idle");
    setError(null);
    setTitle("");
    setCategory("SONSTIGES");
    setStagedDocumentId(null);
    setStagedFileUrl(null);
    setFileName(null);
  }

  async function processFile(rawFile: File) {
    setError(null);
    setPhase("uploading");

    try {
      const uploadFile = await toUploadPdf(rawFile);
      setFileName(uploadFile.name);

      const stageForm = new FormData();
      stageForm.set("vehicleId", vehicleId);
      stageForm.set("tagUuid", tagUuid);
      stageForm.set("file", uploadFile);

      setPhase("analyzing");

      const [stageResult, classification] = await Promise.all([
        stageVaultDocument(stageForm),
        classifyVaultDocument(rawFile, vehicleId),
      ]);

      if (stageResult.status === "error") {
        setPhase("idle");
        setError(stageResult.message);
        return;
      }

      setStagedDocumentId(stageResult.documentId);
      setStagedFileUrl(stageResult.fileUrl);
      setTitle(classification?.title?.trim() ?? "");
      setCategory(classification?.category ?? "SONSTIGES");
      setPhase("review");
    } catch (caught) {
      setPhase("idle");
      setError(
        caught instanceof Error
          ? caught.message
          : "Upload fehlgeschlagen.",
      );
    }
  }

  function onFileInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    void processFile(file);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    void processFile(file);
  }

  function handleSave() {
    if (!stagedDocumentId || !stagedFileUrl) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Bitte einen Titel eingeben.");
      return;
    }

    setError(null);
    setPhase("saving");

    startTransition(async () => {
      const formData = new FormData();
      formData.set("vehicleId", vehicleId);
      formData.set("tagUuid", tagUuid);
      formData.set("documentId", stagedDocumentId);
      formData.set("title", trimmedTitle);
      formData.set("vaultCategory", category);
      formData.set("fileUrl", stagedFileUrl);

      const result = await saveVaultDocument(formData);
      if (result.status === "error") {
        setPhase("review");
        setError(result.message);
        return;
      }

      setPhase("success");
      router.push(resolvedSuccessHref);
      router.refresh();
    });
  }

  const busy = phase === "uploading" || phase === "analyzing" || pending;

  if (phase === "success") {
    return (
      <section className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-12 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5">
        <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50/80 p-6 text-center shadow-[var(--vd-shadow-sm)]">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
          <p className="mt-3 font-semibold text-emerald-950">Im Tresor gespeichert</p>
        </div>
      </section>
    );
  }

  if (phase === "review" || phase === "saving") {
    return (
      <section className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-12 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5">
        <header className="vd-anim-header space-y-4">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {backLabel}
            </button>
          ) : (
            <PressableLink
              href={resolvedBackHref}
              variant="pill"
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {backLabel}
            </PressableLink>
          )}

          <div className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow)]">
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
              Dokumenten-Tresor
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.55rem] font-semibold tracking-[-0.035em] text-[color:var(--vd-text)]">
              Kurz prüfen
            </h1>
            <p className="mt-1 text-[0.9rem] text-[color:var(--vd-muted)]">
              {vehicleLabel}
              {fileName ? ` · ${fileName}` : ""}
            </p>
          </div>
        </header>

        <form
          className="space-y-4 rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]"
          onSubmit={(event) => {
            event.preventDefault();
            handleSave();
          }}
        >
          <label className="block space-y-1.5">
            <span className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
              Dokumenttitel
            </span>
            <input
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="z. B. KW V3 Gewindefahrwerk"
              className="claim-input"
              autoFocus
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
              Kategorie
            </span>
            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as VaultCategory)
              }
              className="claim-input"
            >
              {VAULT_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {VAULT_CATEGORY_LABELS[value]}
                </option>
              ))}
            </select>
          </label>

          {error ? (
            <p
              role="alert"
              className="rounded-xl bg-red-50 px-3 py-2.5 text-[0.8rem] text-red-700"
            >
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            className="claim-cta w-full"
            disabled={phase === "saving" || pending || !title.trim()}
          >
            {phase === "saving" || pending ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Wird gespeichert…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Im Tresor speichern
              </>
            )}
          </Button>
        </form>
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-12 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5">
      <header className="vd-anim-header space-y-4">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {backLabel}
          </button>
        ) : (
          <PressableLink
            href={resolvedBackHref}
            variant="pill"
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {backLabel}
          </PressableLink>
        )}

        <div className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow)]">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-900 text-white">
            <Archive className="h-5 w-5" aria-hidden />
          </div>
          <p className="mt-4 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
            Dokumenten-Tresor
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.55rem] font-semibold tracking-[-0.035em] text-[color:var(--vd-text)]">
            Gutachten & ABE ablegen
          </h1>
          <p className="mt-1 text-[0.9rem] text-[color:var(--vd-muted)]">
            {vehicleLabel} · KI erkennt nur den Bauteilnamen — schnell & durchsuchbar
          </p>
        </div>
      </header>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_MIME}
        className="sr-only"
        onChange={onFileInput}
      />

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
        onClick={() => !busy && inputRef.current?.click()}
        className={`rounded-[1.35rem] border-2 border-dashed p-8 text-center transition-colors ${
          busy
            ? "cursor-wait border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)]"
            : "cursor-pointer border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] hover:border-neutral-400"
        }`}
      >
        {phase === "uploading" || phase === "analyzing" ? (
          <div className="flex flex-col items-center gap-3">
            <LoaderCircle className="h-8 w-8 animate-spin text-[color:var(--vd-muted)]" />
            <p className="text-[0.95rem] font-medium text-[color:var(--vd-text)]">
              {phase === "uploading"
                ? "Datei wird hochgeladen…"
                : "Analysiere Dokument…"}
            </p>
            <p className="text-[0.82rem] text-[color:var(--vd-muted)]">
              Bauteilname wird erkannt
            </p>
          </div>
        ) : (
          <>
            <CloudUpload className="mx-auto h-9 w-9 text-[color:var(--vd-muted)]" />
            <p className="mt-3 text-[0.95rem] font-medium text-[color:var(--vd-text)]">
              PDF oder Foto hier ablegen
            </p>
            <p className="mt-1 text-[0.82rem] text-[color:var(--vd-muted)]">
              Gutachten, Teilegutachten, ABE
            </p>
          </>
        )}
      </div>

      <div className="space-y-1.5">
        <span className="block text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
          Oder Datei wählen
        </span>
        <DocumentUpload
          disabled={busy}
          label="Datei wählen"
          hint="PDF max. 25 MB · Bilder werden optimiert"
          onReady={(results) => {
            const first = results[0];
            if (!first || busy) return;
            void processFile(first.file);
          }}
        />
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-3 py-2.5 text-[0.8rem] text-red-700"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}
