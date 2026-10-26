"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { InvoiceReviewForm } from "@/components/documents/invoice-review-form";
import { IOSListPage } from "@/components/ui/ios";
import { emptyInvoiceReviewFields } from "@/lib/documents/invoice-review-fields";
import { serializeTopicTags } from "@/lib/documents/entry-topic-tags";
import { uploadDocument } from "@/lib/documents/upload-document";
import { isActionFailure } from "@/lib/permissions/feature-gate-result";
import { showSavedToast } from "@/lib/ui/saved-toast";
import {
  documentDetailHref,
  documentsListHref,
} from "@/lib/vehicle-surface/documents-list-href";
import { isVehicleId } from "@/lib/vehicle-surface/paths";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";
import type { InvoiceTextParseResult } from "@/lib/ocr/text-parse-schema";

type ManualInvoiceEntryFormProps = {
  vehicleId: string;
  tagUuid: string;
  vehicleLabel: string;
  backHref?: string;
  vehicleSurfaceScope?: VehicleSurfaceScope;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function previewKind(file: File): "pdf" | "image" {
  if (file.type === "application/pdf") return "pdf";
  return "image";
}

/** Manual Beleg — same fields as post-scan review, without KI. */
export function ManualInvoiceEntryForm({
  vehicleId,
  tagUuid,
  vehicleLabel,
  backHref,
  vehicleSurfaceScope,
}: ManualInvoiceEntryFormProps) {
  const router = useRouter();
  const resolvedBackHref =
    backHref ??
    documentsListHref(tagUuid, "invoice", vehicleSurfaceScope);
  const [title, setTitle] = useState("");
  const [fields, setFields] = useState<InvoiceTextParseResult>(() =>
    emptyInvoiceReviewFields("service"),
  );
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function clearFile() {
    setFile(null);
    setFileName(null);
  }

  function save() {
    setError(null);
    const storedTitle = title.trim();
    if (storedTitle.length < 2) {
      setError("Bitte eine Bezeichnung eingeben.");
      return;
    }
    if (!file) {
      setError("Bitte PDF oder Bild als Original anhängen.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("vehicleId", vehicleId);
      formData.set("tagUuid", tagUuid);
      formData.set("title", storedTitle.slice(0, 160));
      formData.set("type", "invoice");
      formData.set("category", fields.category);
      formData.set("vendor", fields.vendor?.trim() ?? "");
      formData.set("date", fields.date ?? "");
      formData.set(
        "amount",
        fields.amount == null ? "" : String(fields.amount),
      );
      formData.set(
        "lineItems",
        fields.lineItems?.length ? JSON.stringify(fields.lineItems) : "",
      );
      formData.set("kbaNumber", "");
      formData.set("vehicleApprovals", "");
      formData.set("authority", "");
      formData.set("conditions", "");
      formData.set("technicalSpecs", "");
      formData.set("partCategory", serializeTopicTags(fields.topicTags ?? []));
      formData.set("notes", fields.notes?.trim() ?? "");
      formData.set("manufacturer", "");
      formData.set("invoiceNumber", fields.invoiceNumber?.trim() ?? "");
      formData.set(
        "mileageKm",
        fields.mileageKm == null ? "" : String(fields.mileageKm),
      );
      formData.set("pageCount", "1");
      formData.set("approvalFields", "");
      formData.set("file", file);

      const result = await uploadDocument(formData);
      if (isActionFailure(result)) {
        setError(result.message);
        return;
      }
      if (result.status === "duplicate") {
        setError(result.message);
        return;
      }

      showSavedToast();
      const scope =
        vehicleSurfaceScope ??
        ({
          vehicleId,
          linkedTagUuid: isVehicleId(tagUuid) ? null : tagUuid,
        } satisfies VehicleSurfaceScope);
      const detailHref = documentDetailHref(
        tagUuid,
        result.document.id,
        scope,
      );
      router.push(
        detailHref.includes("?") ? `${detailHref}&saved=1` : `${detailHref}?saved=1`,
      );
      router.refresh();
    });
  }

  return (
    <IOSListPage
      title="Beleg hinzufügen"
      subtitle={`${vehicleLabel} · Manuell ohne KI`}
      backHref={resolvedBackHref}
      backLabel="Belege"
    >
      <InvoiceReviewForm
        title={title}
        onTitleChange={setTitle}
        fields={fields}
        onFieldsChange={(patch) =>
          setFields((current) => ({ ...current, ...patch }))
        }
        manualEntry
        saving={pending}
        error={error}
        onSave={save}
        preview={
          file && previewUrl
            ? {
                url: previewUrl,
                kind: previewKind(file),
                pageCount: 1,
                fileSizeLabel: formatBytes(file.size),
              }
            : undefined
        }
        onReset={file ? clearFile : undefined}
        filePicker={
          !file
            ? {
                disabled: pending,
                label: fileName ?? "Datei wählen",
                onReady: (results) => {
                  const first = results[0];
                  if (!first) return;
                  setFile(first.file);
                  setFileName(first.file.name);
                  setError(null);
                },
              }
            : undefined
        }
      />
    </IOSListPage>
  );
}
