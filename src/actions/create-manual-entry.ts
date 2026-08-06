"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/get-user";
import {
  contributorMayWriteDocumentType,
  getVehicleWriteAccess,
} from "@/lib/auth/vehicle-write-access";
import { DOCUMENT_BUCKET } from "@/lib/documents/constants";
import {
  MANUAL_ENTRY_CATEGORIES,
  MANUAL_ENTRY_MARKER,
  MANUAL_ENTRY_MAX_PHOTOS,
  type ManualEntryCategory,
} from "@/lib/documents/manual-entries";
import { appendMockUploadedDocument } from "@/lib/documents/mock-uploads";
import {
  isUploadFile,
  validateDocumentUpload,
} from "@/lib/security/file-upload";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
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

function fieldsFromFormData(formData: FormData) {
  return {
    vehicleId: String(formData.get("vehicleId") ?? ""),
    tagUuid: String(formData.get("tagUuid") ?? ""),
    category: String(formData.get("category") ?? ""),
    title: String(formData.get("title") ?? ""),
    date: String(formData.get("date") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    vendor: String(formData.get("vendor") ?? ""),
    mileageKm: String(formData.get("mileageKm") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };
}

function collectPhotoFiles(formData: FormData): File[] {
  const files: File[] = [];
  for (const value of formData.getAll("photos")) {
    if (isUploadFile(value)) {
      files.push(value);
    }
  }
  const single = formData.get("photo");
  if (isUploadFile(single)) {
    files.push(single);
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
    return { status: "error", message: "Bitte Titel und Kategorie prüfen." };
  }

  const data = parsed.data;
  const title = data.title.trim() || defaultTitle(data.category);
  const dateRaw = data.date?.trim() || "";
  if (dateRaw && !/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
    return { status: "error", message: "Datum ungültig." };
  }
  const date = dateRaw || null;
  const amount = parseAmount(data.amount);
  const vendor = data.vendor?.trim().slice(0, 160) || null;
  const notes = data.notes?.trim().slice(0, 500) || null;
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
      category: data.category,
      line_items: null,
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
  if (!isSupabaseAdminConfigured()) {
    return {
      status: "error",
      message: "SUPABASE_SERVICE_ROLE_KEY fehlt.",
    };
  }

  const writeAccess = await getVehicleWriteAccess(data.vehicleId, user.id);
  if (!writeAccess.ok || !writeAccess.ownerUserId) {
    return {
      status: "error",
      message: "Kein Schreibzugriff auf dieses Fahrzeug.",
    };
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

  const admin = createAdminClient();

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

    const storagePath = `${data.vehicleId}/${documentId}-${fileCheck.safeName}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    const { error: storageError } = await admin.storage
      .from(DOCUMENT_BUCKET)
      .upload(storagePath, bytes, {
        contentType: fileCheck.mime,
        upsert: false,
      });

    if (storageError) {
      return { status: "error", message: `Foto: ${storageError.message}` };
    }

    const {
      data: { publicUrl },
    } = admin.storage.from(DOCUMENT_BUCKET).getPublicUrl(storagePath);

    fileUrl = publicUrl;
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
    category: data.category,
    notes,
    invoice_number: MANUAL_ENTRY_MARKER,
    mileage_km: mileageKm,
    page_count: pageCount,
    amount,
    date,
  };

  const { error } = await admin.from("documents").insert(row);
  if (error) {
    if (uploadedStoragePath) {
      await admin.storage
        .from(DOCUMENT_BUCKET)
        .remove([uploadedStoragePath])
        .catch(() => undefined);
    }
    return { status: "error", message: error.message };
  }

  revalidateManualPaths(data.tagUuid);
  return { status: "created", documentId };
}
