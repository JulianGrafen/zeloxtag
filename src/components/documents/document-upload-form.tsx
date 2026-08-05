"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LoaderCircle, Upload } from "lucide-react";

import { DocumentUpload } from "@/components/dashboard/DocumentUpload";
import {
  PressableButton,
  PressableLink,
} from "@/components/vehicle-dashboard/Pressable";
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_OPTIONS,
} from "@/lib/documents/constants";
import { uploadDocument } from "@/lib/documents/upload-document";
import type { DocumentType } from "@/types/database";

interface DocumentUploadFormProps {
  vehicleId: string;
  tagUuid: string;
  vehicleLabel: string;
  defaultType?: DocumentType;
}

/** Manual PDF/file upload fallback (no cloud OCR). */
export function DocumentUploadForm({
  vehicleId,
  tagUuid,
  vehicleLabel,
  defaultType = "invoice",
}: DocumentUploadFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<DocumentType>(defaultType);
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <section className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-12 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5">
      <header className="vd-anim-header space-y-4">
        <PressableLink
          href={`/v/${tagUuid}?scan=1`}
          variant="pill"
          className="inline-flex items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Zum Scanner
        </PressableLink>

        <div className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow)]">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-900 text-white">
            <Upload className="h-5 w-5" aria-hidden />
          </div>
          <p className="mt-4 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
            Manuell
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.55rem] font-semibold tracking-[-0.035em] text-[color:var(--vd-text)]">
            Datei hochladen
          </h1>
          <p className="mt-1 text-[0.9rem] text-[color:var(--vd-muted)]">
            {vehicleLabel} · PDF oder Bild (Bilder werden optimiert)
          </p>
        </div>
      </header>

      <form
        className="vd-anim-header space-y-3 rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          if (!file) {
            setError("Bitte eine Datei wählen.");
            return;
          }

          startTransition(async () => {
            const formData = new FormData();
            formData.set("vehicleId", vehicleId);
            formData.set("tagUuid", tagUuid);
            formData.set("title", title);
            formData.set("type", type);
            formData.set("date", date);
            formData.set("amount", type === "abe" ? "" : amount);
            formData.set("file", file);

            const result = await uploadDocument(formData);
            if (result.status === "error") {
              setError(result.message);
              return;
            }
            router.push(
              `/v/${result.tagUuid}/dokumente?type=${result.document.type}`,
            );
            router.refresh();
          });
        }}
      >
        <label className="block space-y-1.5">
          <span className="text-[0.72rem] font-medium tracking-[0.14em] text-[color:var(--vd-muted)] uppercase">
            {type === "abe" ? "Bauteil" : "Titel"}
          </span>
          <input
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={
              type === "abe" ? "z. B. Carbon Frontlippe" : "z. B. Ölwechsel Rechnung"
            }
            className="claim-input"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-[0.72rem] font-medium tracking-[0.14em] text-[color:var(--vd-muted)] uppercase">
            Typ
          </span>
          <select
            value={type}
            onChange={(event) => {
              const next = event.target.value as DocumentType;
              setType(next);
              if (next === "abe") setAmount("");
            }}
            className="claim-input"
          >
            {DOCUMENT_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {DOCUMENT_TYPE_LABELS[option]}
              </option>
            ))}
          </select>
        </label>

        {type === "abe" ? (
          <label className="block space-y-1.5">
            <span className="text-[0.72rem] font-medium tracking-[0.14em] text-[color:var(--vd-muted)] uppercase">
              Datum
            </span>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="claim-input"
            />
          </label>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-[0.72rem] font-medium tracking-[0.14em] text-[color:var(--vd-muted)] uppercase">
                Datum
              </span>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="claim-input"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[0.72rem] font-medium tracking-[0.14em] text-[color:var(--vd-muted)] uppercase">
                Betrag (€)
              </span>
              <input
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="optional"
                className="claim-input"
              />
            </label>
          </div>
        )}

        <div className="space-y-1.5">
          <span className="block text-[0.72rem] font-medium tracking-[0.14em] text-[color:var(--vd-muted)] uppercase">
            Datei
          </span>
          <DocumentUpload
            disabled={pending}
            label={fileName ?? "Datei wählen"}
            hint="PDF max. 10 MB · Bilder → Full HD JPEG"
            onReady={(results) => {
              const first = results[0];
              if (!first) return;
              setFile(first.file);
              setFileName(first.file.name);
              setError(null);
            }}
          />
          {pending ? (
            <p className="flex items-center gap-2 text-[0.78rem] text-[color:var(--vd-muted)]">
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Wird hochgeladen…
            </p>
          ) : null}
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-xl bg-red-50 px-3 py-2.5 text-[0.8rem] text-red-700"
          >
            {error}
          </p>
        ) : null}

        <PressableButton
          type="submit"
          variant="button"
          disabled={pending || !file}
          className="claim-cta inline-flex w-full items-center justify-center gap-2 disabled:opacity-60"
        >
          Hochladen
        </PressableButton>
      </form>
    </section>
  );
}
