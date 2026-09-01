"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/get-user";
import {
  contributorMayWriteDocumentType,
  getVehicleWriteAccess,
  writeAccessErrorMessage,
} from "@/lib/auth/vehicle-write-access";
import { DOCUMENT_BUCKET } from "@/lib/documents/constants";
import { documentStorageObjectPath } from "@/lib/documents/storage-path";
import { FEATURE } from "@/lib/permissions/feature-access";
import { assertOwnerFeature } from "@/lib/permissions/require-feature";
import {
  MANUAL_ENTRY_CATEGORIES,
  MANUAL_ENTRY_MARKER,
  MANUAL_ENTRY_MAX_PHOTOS,
  MANUAL_SERVICE_ENTRY_LABELS,
  MANUAL_SERVICE_ENTRY_TYPES,
  parseManualEntryCategory,
  type ManualEntryCategory,
  type ManualServiceEntryType,
} from "@/lib/documents/manual-entries";
import {
  ensureOilChangeNotes,
  detectOilChangeInvoice,
} from "@/lib/documents/oil-changes";
import { parseLineItems, sumLineItems } from "@/lib/documents/line-items";
import { appendMockUploadedDocument } from "@/lib/documents/mock-uploads";
import {
  validateDocumentUpload,
} from "@/lib/security/file-upload";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { MOCK_TAG_UUIDS } from "@/lib/tags/mock-tags";
import type { Document } from "@/types/database";

export type CreateManualEntryResult =
  | { status: "created"; documentId: string }
  | { status: "error"; message: string };

const fieldsSchema = z.object({
  vehicleId: z.string().uuid(),
  tagUuid: z.string().trim().min(1).max(128),
  category: z.enum(MANUAL_ENTRY_CATEGORIES),
  title: z.string().trim().min(2).max(160),
  date: z.string().trim().max(32).optional().default(""),
  amount: z.string().trim().max(32).optional().default(""),
  vendor: z.string().trim().max(160).optional().default(""),
  mileageKm: z.string().trim().max(16).optional().default(""),
  notes: z.string().trim().max(500).optional().default(""),
  entryType: z.enum(["default", "oil_change"]).optional().default("default"),
  serviceType: z.enum(MANUAL_SERVICE_ENTRY_TYPES).optional().default("service"),
  details: z.string().trim().max(200).optional().default(""),
  oilSpec: z.string().trim().max(120).optional().default(""),
  oilAmountLiters: z.string().trim().max(16).optional().default(""),
  filterChanged: z.enum(["true", "false", ""]).optional().default(""),
});

function parseAmount(raw: string | undefined): number | null {
  if (!raw?.trim()) return null;
  if (/%/.test(raw)) return null;
  let normalized = raw.replace(/\s/g, "").replace(/€|eur/gi, "");
  if (/\d,\d{1,2}$/.test(normalized) && normalized.includes(".")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (/\d,\d{1,2}$/.test(normalized)) {
    normalized = normalized.replace(",", ".");
  }
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}

function parseMileageKm(raw: string | undefined): number | null {
  if (!raw?.trim()) return null;
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  const value = Number.parseInt(digits, 10);
  if (!Number.isFinite(value) || value < 0 || value > 9_999_999) return null;
  return value;
}

function defaultTitle(category: ManualEntryCategory): string {
  return category === "tuning" ? "Tuning-Eintrag" : "Wartungseintrag";
}

function categoryForServiceType(
  serviceType: ManualServiceEntryType,
): ManualEntryCategory {
  return serviceType === "tuning_part" ? "tuning" : "service";
}

function titleForServiceType(
  serviceType: ManualServiceEntryType,
  details: string | null,
): string {
  if (serviceType === "other" && details) {
    return details.slice(0, 160);
  }
  return MANUAL_SERVICE_ENTRY_LABELS[serviceType];
}

function combineManualNotes(
  details: string | null | undefined,
  notes: string | null | undefined,
): string | null {
  const parts = [details?.trim(), notes?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join("\n").slice(0, 500) : null;
}

function fieldsFromFormData(formData: FormData) {
  const categoryRaw = String(formData.get("category") ?? "");
  return {
    vehicleId: String(formData.get("vehicleId") ?? ""),
    tagUuid: String(formData.get("tagUuid") ?? ""),
    category: parseManualEntryCategory(categoryRaw) ?? "service",
    title: String(formData.get("title") ?? ""),
    date: String(formData.get("date") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    vendor: String(formData.get("vendor") ?? ""),
    mileageKm: String(formData.get("mileageKm") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    entryType: String(formData.get("entryType") ?? "default"),
    serviceType: String(formData.get("serviceType") ?? "service"),
    details: String(formData.get("details") ?? ""),
    oilSpec: String(formData.get("oilSpec") ?? ""),
    oilAmountLiters: String(formData.get("oilAmountLiters") ?? ""),
    filterChanged: String(formData.get("filterChanged") ?? ""),
  };
}

function buildOilChangeManualFields(
  data: z.infer<typeof fieldsSchema>,
): {
  category: ManualEntryCategory;
  title: string;
  notes: string | null;
} {
  const oilSpec = data.oilSpec?.trim() || null;
  const litersRaw = data.oilAmountLiters?.trim() ?? "";
  let oilAmountLiters: number | null = null;
  if (litersRaw) {
    const value = Number.parseFloat(litersRaw.replace(",", "."));
    if (Number.isFinite(value) && value > 0 && value <= 20) {
      oilAmountLiters = Math.round(value * 10) / 10;
    }
  }
  const filterChanged = data.filterChanged === "true";
  const userNotes = data.notes?.trim() ?? "";

  const parts = ["Ölwechsel"];
  if (oilSpec) parts.push(oilSpec);
  if (oilAmountLiters) {
    parts.push(`${oilAmountLiters.toLocaleString("de-DE")} l`);
  }
  parts.push(filterChanged ? "Filter gewechselt" : "Filter unklar");
  if (userNotes) parts.push(userNotes);

  const blob = parts.join(" · ");
  const detected = detectOilChangeInvoice({
    title: "Ölwechsel",
    notes: blob,
    category: "service",
  });

  return {
    category: "service",
    title: data.title.trim() || "Ölwechsel",
    notes: ensureOilChangeNotes(blob, detected),
  };
}

function normalizeManualUploadFile(
  value: unknown,
  fallbackName: string,
): File | null {
  if (value instanceof File && value.size > 0) {
    if (value.name?.trim()) return value;
    return new File([value], fallbackName, {
      type: value.type || "application/octet-stream",
    });
  }
  if (typeof Blob !== "undefined" && value instanceof Blob && value.size > 0) {
    return new File([value], fallbackName, {
      type: value.type || "application/octet-stream",
    });
  }
  return null;
}

function collectPhotoFiles(formData: FormData): File[] {
  const files: File[] = [];
  let index = 0;
  for (const value of formData.getAll("photos")) {
    const file = normalizeManualUploadFile(value, `manual-photo-${index + 1}.jpg`);
    if (file) {
      files.push(file);
      index += 1;
    }
  }
  const single = formData.get("photo");
  const singleFile = normalizeManualUploadFile(single, "manual-photo.jpg");
  if (singleFile) {
    files.push(singleFile);
  }
  return files.slice(0, MANUAL_ENTRY_MAX_PHOTOS);
}

function revalidateManualPaths(tagUuid: string) {
  revalidatePath(`/v/${tagUuid}`);
  revalidatePath(`/v/${tagUuid}/eintrag`);
  revalidatePath(`/v/${tagUuid}/umbauten`);
  revalidatePath(`/v/${tagUuid}/service`);
  revalidatePath(`/v/${tagUuid}/dokumente`);
  revalidatePath(`/v/${tagUuid}/intervalle`);
  revalidatePath(`/v/${tagUuid}/historie`);
}

/**
 * Persist a user-written Wartung / Tuning log, optionally with photo docs.
 * Accepts FormData: text fields + optional `photos` / `photo` files.
 */
export async function createManualVehicleEntry(
  formData: FormData,
): Promise<CreateManualEntryResult> {
  const parsed = fieldsSchema.safeParse(fieldsFromFormData(formData));
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path.join(".") ?? "Eingabe";
    return {
      status: "error",
      message: `Ungültige ${field === "vehicleId" ? "Fahrzeug-ID" : field}.`,
    };
  }

  const data = parsed.data;
  const serviceType = data.serviceType as ManualServiceEntryType;
  const isOilChangeEntry =
    data.entryType === "oil_change" || serviceType === "oil_change";
  const oilFields = isOilChangeEntry
    ? buildOilChangeManualFields({
        ...data,
        oilSpec: data.oilSpec?.trim() || data.details?.trim() || "",
      })
    : null;
  const category =
    oilFields?.category ??
    (data.category as ManualEntryCategory) ??
    categoryForServiceType(serviceType);
  const title =
    oilFields?.title ??
    (data.title.trim() ||
      titleForServiceType(serviceType, data.details?.trim() || null) ||
      defaultTitle(category));
  const dateRaw = data.date?.trim() || "";
  if (dateRaw && !/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
    return { status: "error", message: "Datum ungültig." };
  }
  const date = dateRaw || null;
  const lineItems = parseLineItems(formData.get("lineItems"));
  const amountFromLines = sumLineItems(lineItems);
  const amount = amountFromLines ?? parseAmount(data.amount);
  const vendor = data.vendor?.trim().slice(0, 160) || null;
  const notes =
    oilFields?.notes ??
    combineManualNotes(data.details, data.notes);
  const mileageKm = parseMileageKm(data.mileageKm);
  const documentId = randomUUID();
  const now = new Date().toISOString();
  const photos = collectPhotoFiles(formData);

  let fileUrl = `manual://entry/${documentId}`;
  let pageCount: number | null = null;
  let uploadedStoragePath: string | null = null;

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    if (data.tagUuid !== MOCK_TAG_UUIDS.active) {
      return {
        status: "error",
        message: "Mock-Eintrag nur für demo-active-tag.",
      };
    }
    if (photos.length > 0) {
      fileUrl = `mock://manual-entry/${documentId}`;
      pageCount = photos.length;
    }
    const document: Document = {
      id: documentId,
      vehicle_id: data.vehicleId,
      user_id: "user_demo",
      created_by: "user_demo",
      title,
      type: "invoice",
      file_url: fileUrl,
      vendor,
      category,
      line_items: lineItems,
      kba_number: null,
      vehicle_approvals: null,
      authority: null,
      conditions: null,
      part_category: null,
      notes,
      page_count: pageCount,
      manufacturer: null,
      invoice_number: MANUAL_ENTRY_MARKER,
      mileage_km: mileageKm,
      technical_specs: null,
      approval_fields: null,
      amount,
      date,
      created_at: now,
    };
    await appendMockUploadedDocument(document);
    revalidateManualPaths(data.tagUuid);
    return { status: "created", documentId };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { status: "error", message: "Bitte anmelden." };
  }

  const writeAccess = await getVehicleWriteAccess(data.vehicleId, user.id);
  if (!writeAccess.ok || !writeAccess.ownerUserId) {
    return {
      status: "error",
      message: writeAccessErrorMessage(writeAccess),
    };
  }
  const manualEntry = await assertOwnerFeature(
    writeAccess.ownerUserId,
    FEATURE.ADD_MANUAL_SERVICE_ENTRY,
  );
  if (!manualEntry.ok) {
    return { status: "error", message: manualEntry.message };
  }
  if (
    !contributorMayWriteDocumentType(
      writeAccess.isContributor,
      writeAccess.isOwner,
      "invoice",
    )
  ) {
    return {
      status: "error",
      message: "Keine Berechtigung für diesen Eintrag.",
    };
  }

  const supabase = await createClient();

  const clientSentPhotoFlag = formData.has("photo") || formData.has("photos");
  if (clientSentPhotoFlag && photos.length === 0) {
    return {
      status: "error",
      message: "Foto konnte nicht gelesen werden. Bitte erneut versuchen.",
    };
  }

  if (photos.length > 0) {
    // Client should send one compressed image or a multi-page PDF.
    const file = photos[0];
    const fileCheck = await validateDocumentUpload(file, { pdfOnly: false });
    if (!fileCheck.ok) {
      return { status: "error", message: fileCheck.error };
    }

    const storagePath = documentStorageObjectPath(
      data.vehicleId,
      documentId,
      fileCheck.safeName,
    );
    const bytes = Buffer.from(fileCheck.bytes);
    const { error: storageError } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .upload(storagePath, bytes, {
        contentType: fileCheck.mime,
        upsert: false,
      });

    if (storageError) {
      return { status: "error", message: `Foto: ${storageError.message}` };
    }

    fileUrl = storagePath;
    uploadedStoragePath = storagePath;
    const pageCountRaw = Number.parseInt(
      String(formData.get("pageCount") ?? ""),
      10,
    );
    pageCount =
      Number.isFinite(pageCountRaw) && pageCountRaw > 0
        ? pageCountRaw
        : fileCheck.mime === "application/pdf"
          ? null
          : 1;
  }

  const row = {
    id: documentId,
    vehicle_id: data.vehicleId,
    user_id: writeAccess.ownerUserId,
    created_by: user.id,
    title,
    type: "invoice" as const,
    file_url: fileUrl,
    vendor,
    category,
    line_items: lineItems && lineItems.length > 0 ? lineItems : null,
    notes,
    invoice_number: MANUAL_ENTRY_MARKER,
    mileage_km: mileageKm,
    page_count: pageCount,
    amount,
    date,
  };

  const insertAttempts: Array<Record<string, unknown>> = [
    row,
    { ...row, created_by: undefined },
    {
      id: row.id,
      vehicle_id: row.vehicle_id,
      user_id: row.user_id,
      title: row.title,
      type: row.type,
      file_url: row.file_url,
      vendor: row.vendor,
      category: row.category,
      notes: row.notes,
      invoice_number: row.invoice_number,
      mileage_km: row.mileage_km,
      page_count: row.page_count,
      amount: row.amount,
      date: row.date,
    },
  ];

  let lastError: string | null = null;
  for (const attempt of insertAttempts) {
    const { error } = await supabase.from("documents").insert(attempt);
    if (!error) {
      revalidateManualPaths(data.tagUuid);
      return { status: "created", documentId };
    }
    lastError = error.message;
  }

  if (uploadedStoragePath) {
    await supabase.storage
      .from(DOCUMENT_BUCKET)
      .remove([uploadedStoragePath])
      .catch(() => undefined);
  }
  return { status: "error", message: lastError ?? "Speichern fehlgeschlagen." };

}
