"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  Camera,
  ExternalLink,
  FileText,
  FileUp,
  LoaderCircle,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";

import { InBrowserCamera } from "@/components/documents/in-browser-camera";
import { GermanDateInput } from "@/components/documents/german-date-input";
import {
  WizardAnalyzingPanel,
  WizardCameraError,
  WizardScanHeader,
  WizardShell,
} from "@/components/documents/wizard-scan-shell";
import {
  PressableButton,
  PressableLink,
} from "@/components/vehicle-dashboard/Pressable";
import { Button } from "@/components/ui/button";
import {
  saveVaultDocument,
  stageVaultDocument,
} from "@/lib/documents/vault-document";
import { scanTypeDefinition } from "@/lib/documents/scan-types";
import {
  documentMediaKind,
  isViewableDocumentUrl,
  resolveDocumentViewUrl,
} from "@/lib/documents/viewable-url";
import {
  localDateIso,
  normalizeDocumentDateIso,
} from "@/lib/documents/format";
import { convertImagesToPdf } from "@/lib/utils/pdf-converter";
import {
  VAULT_CATEGORIES,
  VAULT_CATEGORY_LABELS,
  VAULT_DOCUMENT_KINDS,
  VAULT_DOCUMENT_KIND_LABELS,
  type VaultCategory,
  type VaultClassification,
  type VaultDocumentKind,
} from "@/lib/validations/vaultClassificationSchema";

const TOTAL_STEPS = 2;
const MAX_VAULT_PAGES = 12;
const VAULT_SCAN = scanTypeDefinition("vault");

type VaultPhase =
  | "choose-source"
  | "capture"
  | "pages-hub"
  | "analyzing"
  | "review"
  | "saving";

export interface VaultUploadWizardProps {
  vehicleId: string;
  tagUuid: string;
  vehicleLabel: string;
  successHref?: string;
  onBack?: () => void;
  backHref?: string;
  backLabel?: string;
}

function isPdf(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

async function buildVaultUploadFile(
  pages: File[],
): Promise<{ file: File; pageCount: number }> {
  if (pages.length === 0) {
    throw new Error("Bitte mindestens eine Seite hinzufügen.");
  }

  const pdfs = pages.filter(isPdf);
  const images = pages.filter((page) => !isPdf(page));

  if (pdfs.length > 0 && images.length > 0) {
    throw new Error(
      "Bitte entweder ein PDF oder mehrere Fotos — nicht mischen.",
    );
  }

  if (pdfs.length === 1 && images.length === 0) {
    return { file: pdfs[0]!, pageCount: 1 };
  }

  if (pdfs.length > 1) {
    throw new Error("Bitte nur ein PDF oder mehrere Fotos hochladen.");
  }

  const result = await convertImagesToPdf(images, {
    fileName: `vault-upload-${Date.now()}`,
    fullBleed: true,
    imageCompression: "MEDIUM",
  });

  return { file: result.file, pageCount: result.pageCount };
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

export function VaultUploadWizard({
  vehicleId,
  tagUuid,
  vehicleLabel,
  successHref,
  onBack,
  backHref,
  backLabel = "Zurück",
}: VaultUploadWizardProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const filePickerAppendRef = useRef(false);
  const pagePreviewUrlsRef = useRef<string[]>([]);
  const documentPreviewUrlRef = useRef<string | null>(null);
  const [phase, setPhase] = useState<VaultPhase>("choose-source");
  const [error, setError] = useState<string | null>(null);
  const [pageFiles, setPageFiles] = useState<File[]>([]);
  const [pagePreviewUrls, setPagePreviewUrls] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [scanDate, setScanDate] = useState(() => localDateIso());
  const [category, setCategory] = useState<VaultCategory>("SONSTIGES");
  const [documentKind, setDocumentKind] = useState<VaultDocumentKind | null>(
    null,
  );
  const [stagedDocumentId, setStagedDocumentId] = useState<string | null>(null);
  const [stagedFileUrl, setStagedFileUrl] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewKind, setPreviewKind] = useState<"pdf" | "image">("pdf");
  const [pending, startTransition] = useTransition();

  const resolvedBackHref = backHref ?? `/v/${tagUuid}/dokumente?type=abe`;
  const resolvedSuccessHref =
    successHref ?? `/v/${tagUuid}/dokumente?type=abe`;

  useEffect(() => {
    return () => {
      for (const url of pagePreviewUrlsRef.current) {
        if (url) URL.revokeObjectURL(url);
      }
      if (documentPreviewUrlRef.current) {
        URL.revokeObjectURL(documentPreviewUrlRef.current);
      }
    };
  }, []);

  function clearDocumentPreview() {
    if (documentPreviewUrlRef.current) {
      URL.revokeObjectURL(documentPreviewUrlRef.current);
      documentPreviewUrlRef.current = null;
    }
    setPreviewUrl(null);
    setPreviewKind("pdf");
  }

  function setDocumentPreview(file: File) {
    clearDocumentPreview();
    const url = URL.createObjectURL(file);
    documentPreviewUrlRef.current = url;
    setPreviewUrl(url);
    setPreviewKind(isPdf(file) ? "pdf" : "image");
  }

  function setStagedDocumentPreview(
    stagedUrl: string | null,
    fallbackFile: File,
  ) {
    clearDocumentPreview();
    if (stagedUrl && isViewableDocumentUrl(stagedUrl)) {
      setPreviewUrl(resolveDocumentViewUrl(stagedUrl));
      const kind = documentMediaKind(stagedUrl);
      setPreviewKind(kind === "image" ? "image" : "pdf");
      return;
    }
    setDocumentPreview(fallbackFile);
  }

  useEffect(() => {
    if (phase !== "pages-hub") {
      for (const url of pagePreviewUrlsRef.current) {
        if (url) URL.revokeObjectURL(url);
      }
      pagePreviewUrlsRef.current = [];
      setPagePreviewUrls([]);
      return;
    }

    for (const url of pagePreviewUrlsRef.current) {
      if (url) URL.revokeObjectURL(url);
    }
    const urls = pageFiles.map((file) =>
      isPdf(file) ? "" : URL.createObjectURL(file),
    );
    pagePreviewUrlsRef.current = urls.filter(Boolean);
    setPagePreviewUrls(urls);

    return () => {
      for (const url of pagePreviewUrlsRef.current) {
        if (url) URL.revokeObjectURL(url);
      }
    };
  }, [phase, pageFiles]);

  function resetWizard() {
    setPhase("choose-source");
    setError(null);
    setPageFiles([]);
    setTitle("");
    setScanDate(localDateIso());
    setCategory("SONSTIGES");
    setDocumentKind(null);
    setStagedDocumentId(null);
    setStagedFileUrl(null);
    setPageCount(null);
    setFileName(null);
    clearDocumentPreview();
  }

  function addPage(file: File) {
    setPageFiles((current) => {
      if (current.length >= MAX_VAULT_PAGES) {
        setError(`Maximal ${MAX_VAULT_PAGES} Seiten.`);
        return current;
      }
      const hasPdf = current.some(isPdf);
      if (hasPdf || isPdf(file)) {
        setError("Nach einem PDF keine weiteren Seiten — oder nur Fotos verwenden.");
        return current;
      }
      setError(null);
      return [...current, file];
    });
    setPhase("pages-hub");
  }

  function removePage(index: number) {
    setPageFiles((current) => current.filter((_, i) => i !== index));
    setError(null);
  }

  async function analyzePages(pages: File[]) {
    if (pages.length === 0) {
      setError("Bitte mindestens eine Seite hinzufügen.");
      return;
    }

    setError(null);
    setPhase("analyzing");

    try {
      const { file: uploadFile, pageCount: mergedPageCount } =
        await buildVaultUploadFile(pages);
      setFileName(uploadFile.name);
      setPageCount(mergedPageCount);

      const stageForm = new FormData();
      stageForm.set("vehicleId", vehicleId);
      stageForm.set("tagUuid", tagUuid);
      stageForm.set("file", uploadFile);

      const classifySource = pages.find((page) => !isPdf(page)) ?? pages[0]!;

      const [stageResult, classification] = await Promise.all([
        stageVaultDocument(stageForm),
        classifyVaultDocument(classifySource, vehicleId),
      ]);

      if (stageResult.status === "error") {
        setPhase("pages-hub");
        setError(stageResult.message);
        return;
      }

      setStagedDocumentId(stageResult.documentId);
      setStagedFileUrl(stageResult.fileUrl);
      setTitle(classification?.title?.trim() ?? "");
      setCategory(classification?.category ?? "SONSTIGES");
      setDocumentKind(classification?.documentKind ?? null);
      setStagedDocumentPreview(stageResult.fileUrl, uploadFile);
      setPhase("review");
    } catch (caught) {
      setPhase("pages-hub");
      setError(
        caught instanceof Error
          ? caught.message
          : "Upload fehlgeschlagen.",
      );
    }
  }

  function handleFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const append = filePickerAppendRef.current;
    filePickerAppendRef.current = false;

    if (!append && files.length === 1 && isPdf(files[0]!)) {
      setPageFiles([files[0]!]);
      void analyzePages([files[0]!]);
      return;
    }

    setPageFiles((current) => {
      const base = append ? current : [];
      const combined = [...base, ...files];
      if (combined.some(isPdf) && combined.length > 1) {
        setError("Bitte nur ein PDF oder mehrere Fotos — nicht mischen.");
        return append ? current : [];
      }
      if (combined.length > MAX_VAULT_PAGES) {
        setError(
          `Maximal ${MAX_VAULT_PAGES} Seiten — es wurden die ersten übernommen.`,
        );
        return combined.slice(0, MAX_VAULT_PAGES);
      }
      setError(null);
      return combined;
    });
    setPhase("pages-hub");
  }

  function openFilePicker(append: boolean) {
    filePickerAppendRef.current = append;
    fileInputRef.current?.click();
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
      if (documentKind) {
        formData.set("vaultDocumentKind", documentKind);
      }
      formData.set("fileUrl", stagedFileUrl);
      formData.set(
        "date",
        normalizeDocumentDateIso(scanDate) ?? localDateIso(),
      );
      if (pageCount != null && pageCount > 0) {
        formData.set("pageCount", String(pageCount));
      }

      const result = await saveVaultDocument(formData);
      if (result.status === "error") {
        setPhase("review");
        setError(result.message);
        return;
      }

      router.push(resolvedSuccessHref);
      router.refresh();
    });
  }

  if (phase === "capture") {
    const pageNumber = pageFiles.length + 1;
    return (
      <>
        {error ? <WizardCameraError message={error} /> : null}
        <InBrowserCamera
          title={pageNumber === 1 ? "Erste Seite" : `Seite ${pageNumber}`}
          hint={
            pageNumber === 1
              ? "Titelseite oder erste Seite im DIN-A4-Rahmen fotografieren"
              : "Nächste Seite fotografieren — danach weiter Seiten hinzufügen oder analysieren"
          }
          captureStep={{ current: 1, total: TOTAL_STEPS }}
          guideFrame="a4"
          guideFrameDimOutside
          guideLabel={pageNumber === 1 ? "Titelseite" : `Seite ${pageNumber}`}
          allowPdf={pageNumber === 1}
          onCapture={(file) => addPage(file)}
          onClose={() => {
            setError(null);
            setPhase(pageFiles.length > 0 ? "pages-hub" : "choose-source");
          }}
        />
      </>
    );
  }

  if (phase === "pages-hub") {
    const canAddMore = pageFiles.length < MAX_VAULT_PAGES;

    return (
      <WizardShell className="gap-4">
        <WizardScanHeader
          eyebrow={`${VAULT_SCAN.heading} · Schritt 1 von ${TOTAL_STEPS}`}
          title="Seiten erfassen"
          vehicleLabel={vehicleLabel}
          currentStep={1}
          totalSteps={TOTAL_STEPS}
          onBack={() => {
            if (
              pageFiles.length > 0 &&
              !window.confirm("Scan abbrechen? Erfasste Seiten gehen verloren.")
            ) {
              return;
            }
            resetWizard();
          }}
          backLabel="Abbrechen"
        />

        {error ? (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-[0.85rem] text-red-700">
            {error}
          </div>
        ) : null}

        {pageFiles.length > 0 ? (
          <ul className="grid grid-cols-2 gap-2">
            {pageFiles.map((file, index) => (
              <li
                key={`${file.name}-${file.size}-${index}`}
                className="relative overflow-hidden rounded-[1.1rem] border border-[color:var(--vd-border)] bg-white shadow-[var(--vd-shadow-sm)]"
              >
                {isPdf(file) ? (
                  <div className="flex aspect-[4/3] items-center justify-center bg-neutral-100 px-3 text-center text-[0.75rem] font-medium text-[color:var(--vd-muted)]">
                    PDF
                  </div>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={pagePreviewUrls[index]}
                    alt={`Seite ${index + 1}`}
                    className="aspect-[4/3] w-full object-cover"
                  />
                )}
                <span className="absolute left-1.5 top-1.5 rounded-md bg-neutral-900/85 px-1.5 py-0.5 text-[0.65rem] font-semibold text-white">
                  Seite {index + 1}
                </span>
                <button
                  type="button"
                  aria-label={`Seite ${index + 1} entfernen`}
                  onClick={() => removePage(index)}
                  className="absolute bottom-1.5 right-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-neutral-800 shadow"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-[1.25rem] border border-dashed border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-4 py-8 text-center">
            <p className="text-[0.9rem] font-medium text-[color:var(--vd-text)]">
              Noch keine Seite erfasst
            </p>
            <p className="mt-1 text-[0.82rem] text-[color:var(--vd-muted)]">
              Fotografiere die Titelseite oder wähle Dateien aus.
            </p>
          </div>
        )}

        <div className="space-y-2">
          {canAddMore ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center gap-2"
                onClick={() => {
                  setError(null);
                  setPhase("capture");
                }}
              >
                <Camera className="h-4 w-4" />
                {pageFiles.length === 0
                  ? "Seite fotografieren"
                  : "Weitere Seite fotografieren"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center gap-2"
                onClick={() => openFilePicker(true)}
              >
                <Plus className="h-4 w-4" />
                Datei hinzufügen
              </Button>
            </>
          ) : (
            <p className="text-center text-[0.78rem] text-[color:var(--vd-muted)]">
              Maximum von {MAX_VAULT_PAGES} Seiten erreicht.
            </p>
          )}

          <Button
            type="button"
            className="claim-cta w-full"
            disabled={pageFiles.length === 0}
            onClick={() => void analyzePages(pageFiles)}
          >
            Fertig — analysieren
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf,.pdf"
          multiple
          className="hidden"
          onChange={handleFilesSelected}
        />
      </WizardShell>
    );
  }

  if (phase === "analyzing") {
    return (
      <WizardShell>
        <WizardScanHeader
          eyebrow={VAULT_SCAN.heading}
          title="Dokument wird analysiert"
          vehicleLabel={vehicleLabel}
          currentStep={1}
          totalSteps={TOTAL_STEPS}
          onBack={resetWizard}
          backLabel="Abbrechen"
        />
        <WizardAnalyzingPanel
          label="Analysiere Dokument…"
          subtitle={
            pageCount != null && pageCount > 1
              ? `${pageCount} Seiten werden zusammengeführt`
              : "Titel, Kategorie und Dokumentenart werden erkannt"
          }
        />
      </WizardShell>
    );
  }

  if (phase === "review" || phase === "saving") {
    const resolvedPageCount = pageCount ?? 1;

    return (
      <WizardShell className="gap-4">
        <WizardScanHeader
          eyebrow={VAULT_SCAN.heading}
          title="Kurz prüfen"
          vehicleLabel={
            fileName
              ? `${vehicleLabel} · ${fileName}`
              : vehicleLabel
          }
          currentStep={2}
          totalSteps={TOTAL_STEPS}
          onBack={() => {
            clearDocumentPreview();
            setPhase("pages-hub");
            setStagedDocumentId(null);
            setStagedFileUrl(null);
          }}
          backLabel="Seiten bearbeiten"
        />

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
              Scandatum
            </span>
            <GermanDateInput
              value={scanDate}
              onChange={(value) => setScanDate(value ?? localDateIso())}
              required
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
              Art des Dokuments
            </span>
            <select
              value={documentKind ?? ""}
              onChange={(event) => {
                const value = event.target.value;
                setDocumentKind(
                  value ? (value as VaultDocumentKind) : null,
                );
              }}
              className="claim-input"
            >
              <option value="">Unbekannt / Sonstiges</option>
              {VAULT_DOCUMENT_KINDS.map((value) => (
                <option key={value} value={value}>
                  {VAULT_DOCUMENT_KIND_LABELS[value]}
                </option>
              ))}
            </select>
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
                Im Gutachten Tresor speichern
              </>
            )}
          </Button>

          <button
            type="button"
            onClick={resetWizard}
            className="flex w-full items-center justify-center gap-2 py-2 text-[0.82rem] font-medium text-[color:var(--vd-muted)]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Neu scannen
          </button>
        </form>

        {previewUrl ? (
          <section className="overflow-hidden rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] shadow-[var(--vd-shadow-sm)]">
            <div className="flex items-center justify-between gap-2 border-b border-[color:var(--vd-border)] px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2 text-[0.78rem] text-[color:var(--vd-muted)]">
                <FileText className="h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate">
                  Dokumentvorschau · {resolvedPageCount}{" "}
                  {resolvedPageCount === 1 ? "Seite" : "Seiten"}
                </span>
              </div>
              <PressableButton
                type="button"
                variant="button"
                onClick={() => {
                  window.open(previewUrl, "_blank", "noopener,noreferrer");
                }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-3 py-1.5 text-[0.72rem] font-semibold text-[color:var(--vd-text)]"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                Neues Fenster
              </PressableButton>
            </div>
            <div className="max-h-[min(62vh,560px)] min-h-[240px] overflow-auto bg-neutral-100">
              {previewKind === "pdf" ? (
                <iframe
                  title="Gutachten Tresor · Vorschau"
                  src={previewUrl}
                  className="h-[min(62vh,560px)] w-full border-0 bg-white"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewUrl}
                  alt="Gutachten Tresor · Vorschau"
                  className="mx-auto block w-full object-contain"
                />
              )}
            </div>
          </section>
        ) : null}
      </WizardShell>
    );
  }

  return (
    <WizardShell>
      <header>
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
      </header>

      <div className="mt-4 rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow)]">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-900 text-white">
          <Archive className="h-5 w-5" aria-hidden />
        </div>
        <p className="mt-4 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
          {VAULT_SCAN.heading}
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.4rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
          {VAULT_SCAN.title} · Upload
        </h1>
        <p className="mt-1 text-[0.85rem] text-[color:var(--vd-muted)]">
          {vehicleLabel} · {VAULT_SCAN.subheading}
        </p>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-[0.85rem] text-red-700">
          {error}
        </div>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf,.pdf"
        multiple
        className="hidden"
        onChange={handleFilesSelected}
      />

      <button
        type="button"
        onClick={() => {
          setError(null);
          setPhase("capture");
        }}
        className="group relative w-full rounded-[1.35rem] border-2 border-neutral-900 bg-neutral-900 p-5 text-left text-white shadow-[var(--vd-shadow)] transition-opacity active:opacity-80"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-white/50">
              Empfohlen
            </p>
            <p className="mt-1 text-[1rem] font-semibold">Seiten scannen</p>
            <p className="mt-1 text-[0.82rem] leading-relaxed text-white/65">
              Mehrere Fotos nacheinander · werden zu einem PDF zusammengeführt
            </p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
            <Camera className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <span className="rounded-lg bg-white/10 px-2.5 py-1 text-[0.7rem] font-medium">
            bis {MAX_VAULT_PAGES} Seiten
          </span>
        </div>
      </button>

      <button
        type="button"
        onClick={() => openFilePicker(false)}
        className="group w-full rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 text-left shadow-[var(--vd-shadow-sm)] transition-colors hover:border-neutral-300 active:bg-neutral-50"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
              Datei-Upload
            </p>
            <p className="mt-1 text-[1rem] font-semibold text-[color:var(--vd-text)]">
              PDF oder Fotos hochladen
            </p>
            <p className="mt-1 text-[0.82rem] leading-relaxed text-[color:var(--vd-muted)]">
              Mehrere Bilder oder ein PDF — Fotos werden automatisch zusammengeführt
            </p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--vd-border)]">
            <FileUp className="h-5 w-5 text-[color:var(--vd-muted)]" />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <span className="rounded-lg border border-[color:var(--vd-border)] bg-neutral-100 px-2.5 py-1 text-[0.7rem] font-medium text-neutral-600">
            Mehrfachauswahl
          </span>
        </div>
      </button>
    </WizardShell>
  );
}
