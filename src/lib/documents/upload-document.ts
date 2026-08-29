"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-user";
import {
  contributorMayWriteDocumentType,
  getVehicleWriteAccess,
  writeAccessErrorMessage,
} from "@/lib/auth/vehicle-write-access";
import { FEATURE } from "@/lib/permissions/feature-access";
import { assertVehicleDocumentWrite } from "@/lib/permissions/require-feature";
import {
  isUploadFile,
  validateDocumentUpload,
} from "@/lib/security/file-upload";
import { parseStrictBody } from "@/lib/security/parse-body";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { MOCK_TAG_UUIDS } from "@/lib/tags/mock-tags";
import type { Document } from "@/types/database";

import { parseApprovalFields } from "./approval-fields";
import { DOCUMENT_BUCKET } from "./constants";
import {
  documentPageHash,
  buildDuplicateDocumentHint,
  findDuplicateDocument,
} from "./find-duplicate-document";
import { guardDocumentTitle } from "./guard-document-title";
import { normalizeDocumentDateIso } from "./format";
import { parseLineItems } from "./line-items";
import { appendMockUploadedDocument } from "./mock-uploads";
import {
  detectOilChangeInvoice,
  ensureOilChangeNotes,
} from "./oil-changes";
import { sanitizeVendorForStorage } from "./sanitize-vendor";
import { parseAbeConditions, parseStringList } from "./string-list";
import { parseTechnicalSpecs } from "./technical-specs";
import {
  resolveUploadMileageKm,
  syncApprovalFieldsMileage,
} from "./document-mileage";
import { validateMileageAgainstHistory } from "./validate-mileage";
import {
  metaFromFormData,
  UPLOAD_AUTHORITY_MAX,
  UPLOAD_KBA_NUMBER_MAX,
  UPLOAD_NOTES_MAX,
  UPLOAD_PART_CATEGORY_MAX,
  uploadDocumentMetaSchema,
} from "./upload-schema";

export type UploadDocumentResult =
  | { status: "uploaded"; document: Document; tagUuid: string }
  | {
      status: "duplicate";
      document: Document;
      tagUuid: string;
      message: string;
    }
  | { status: "error"; message: string };

function parseAmount(raw: string | undefined): number | null {
  if (!raw?.trim()) return null;
  // Percentages (Skonto/Rabatt) are never EUR totals.
  if (/%/.test(raw)) return null;
  let normalized = raw.replace(/\s/g, "").replace(/€|eur/gi, "");
  // German: 1.234,56 → 1234.56; plain 428,90 → 428.90
  if (/\d,\d{1,2}$/.test(normalized) && normalized.includes(".")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (/\d,\d{1,2}$/.test(normalized)) {
    normalized = normalized.replace(",", ".");
  }
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}

function parseDate(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  return normalizeDocumentDateIso(raw);
}

function parseMileageKm(raw: string | undefined): number | null {
  if (!raw?.trim()) return null;
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  const value = Number.parseInt(digits, 10);
  if (!Number.isFinite(value) || value < 0 || value > 9_999_999) return null;
  return value;
}

/**
 * Persist a document PDF to Supabase Storage + documents row.
 * Strict Zod metadata + magic-byte MIME checks before any write.
 */
export async function uploadDocument(
  formData: FormData,
): Promise<UploadDocumentResult> {
  const metaParsed = parseStrictBody(
    uploadDocumentMetaSchema,
    metaFromFormData(formData),
  );
  if (!metaParsed.ok) {
    const field = metaParsed.issues[0]?.path.join(".") ?? "Metadaten";
    return {
      status: "error",
      message: `Ungültige Upload-Daten (${field}).`,
    };
  }

  const meta = metaParsed.data;
  const file = formData.get("file");
  if (!isUploadFile(file)) {
    return { status: "error", message: "Bitte eine Datei auswählen." };
  }

  const fileCheck = await validateDocumentUpload(file, { pdfOnly: true });
  if (!fileCheck.ok) {
    return { status: "error", message: fileCheck.error };
  }

  const { vehicleId, tagUuid } = meta;

  const amount = parseAmount(meta.amount);
  const date = parseDate(meta.date);
  const vendorParsed = sanitizeVendorForStorage(meta.vendor.slice(0, 160) || null);
  let vendor = vendorParsed.vendor;
  let category = meta.category.slice(0, 40) || null;
  const lineItems = parseLineItems(meta.lineItems);
  const kbaNumber = meta.kbaNumber.slice(0, UPLOAD_KBA_NUMBER_MAX) || null;
  const vehicleApprovals = parseStringList(meta.vehicleApprovals);
  const authority = meta.authority.slice(0, UPLOAD_AUTHORITY_MAX) || null;
  const conditions = parseAbeConditions(meta.conditions);
  const technicalSpecs = parseTechnicalSpecs(meta.technicalSpecs);
  const partCategory =
    meta.partCategory.slice(0, UPLOAD_PART_CATEGORY_MAX) || null;
  let notes = meta.notes.slice(0, UPLOAD_NOTES_MAX) || null;
  const manufacturer = meta.manufacturer.slice(0, 120) || null;
  const invoiceNumber =
    meta.invoiceNumber.slice(0, UPLOAD_KBA_NUMBER_MAX) || null;
  const pageCountParsed = Number.parseInt(meta.pageCount, 10);
  const pageCount =
    Number.isFinite(pageCountParsed) && pageCountParsed > 0
      ? pageCountParsed
      : null;
  let approvalFields = parseApprovalFields(meta.approvalFields);
  const mileageKm = resolveUploadMileageKm(
    parseMileageKm(meta.mileageKm),
    approvalFields,
  );
  approvalFields = syncApprovalFieldsMileage(approvalFields, mileageKm);

  // Durable oil-change marker for Intervalle history (no raw OCR at read time).
  const oil = detectOilChangeInvoice({
    title: meta.title,
    summary: meta.title,
    vendor,
    category,
    notes,
    lineItems,
  });
  notes = ensureOilChangeNotes(notes, oil);
  const title = guardDocumentTitle(
    meta.title,
    vendor ?? "Beleg",
  );
  const typeRaw = meta.type;
  if (vendorParsed.needsReview) {
    notes = notes?.trim()
      ? `${notes.trim()} · Werkstatt prüfen`
      : "Werkstatt prüfen";
  }

  const documentId = randomUUID();
  const safeName = fileCheck.safeName;
  const now = new Date().toISOString();

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    if (tagUuid !== MOCK_TAG_UUIDS.active) {
      return {
        status: "error",
        message: "Mock-Upload nur für demo-active-tag.",
      };
    }

    const document: Document = {
      id: documentId,
      vehicle_id: vehicleId,
      user_id: "user_demo",
      created_by: "user_demo",
      title,
      type: typeRaw,
      file_url: `mock://upload/${documentId}/${safeName}`,
      vendor,
      category,
      line_items: lineItems,
      kba_number: kbaNumber,
      vehicle_approvals: vehicleApprovals,
      authority,
      conditions,
      part_category: partCategory,
      notes,
      page_count: pageCount,
      manufacturer,
      invoice_number: invoiceNumber,
      mileage_km: mileageKm,
      technical_specs: technicalSpecs,
      approval_fields: approvalFields,
      amount,
      date,
      created_at: now,
    };

    await appendMockUploadedDocument(document);
    revalidatePath(`/v/${tagUuid}`);
    revalidatePath(`/v/${tagUuid}/dokumente`);
    revalidatePath(`/v/${tagUuid}/service`);
    revalidatePath(`/v/${tagUuid}/intervalle`);
    return { status: "uploaded", document, tagUuid };
  }

  const user = await getCurrentUser();
  if (!user) {
    return {
      status: "error",
      message: "Bitte mit dem Fahrzeug-Konto anmelden, um zu speichern.",
    };
  }

  if (!isSupabaseAdminConfigured()) {
    return {
      status: "error",
      message: "SUPABASE_SERVICE_ROLE_KEY fehlt für Dokument-Uploads.",
    };
  }

  // Service role for storage/DB writes; ownership is enforced explicitly below
  // so accounts never write into each other's vehicles.
  const supabase = createAdminClient();

  const writeAccess = await getVehicleWriteAccess(vehicleId, user.id);
  if (!writeAccess.ok || !writeAccess.ownerUserId) {
    return {
      status: "error",
      message: writeAccessErrorMessage(writeAccess),
    };
  }
  const vault = await assertVehicleDocumentWrite(
    writeAccess,
    FEATURE.DOCUMENT_VAULT,
  );
  if (!vault.ok) {
    return { status: "error", message: vault.message };
  }
  if (
    !contributorMayWriteDocumentType(
      writeAccess.isContributor,
      writeAccess.isOwner,
      typeRaw,
    )
  ) {
    return {
      status: "error",
      message: "Schrauber können nur Rechnungen, Reparaturen und Service eintragen.",
    };
  }

  const ownerUserId = writeAccess.ownerUserId;

  const bytes = Buffer.from(await file.arrayBuffer());
  const pageHash = documentPageHash(bytes);
  if (!notes?.includes(`pageHash:${pageHash}`)) {
    notes = notes?.trim()
      ? `${notes.trim()} · pageHash:${pageHash}`
      : `pageHash:${pageHash}`;
  }

  const { data: existingRows } = await supabase
    .from("documents")
    .select("*")
    .eq("vehicle_id", vehicleId);

  const existingDocs = (existingRows ?? []) as Document[];

  const forceMileageSave = meta.forceMileageSave === "1";
  if (!forceMileageSave) {
    const mileageCheck = validateMileageAgainstHistory(
      mileageKm,
      date,
      existingDocs,
    );
    if (!mileageCheck.ok) {
      return {
        status: "error",
        message: mileageCheck.warning ?? "Kilometerstand unplausibel.",
      };
    }
  }

  const forceDuplicateSave = meta.forceDuplicateSave === "1";
  if (!forceDuplicateSave) {
    const duplicate = findDuplicateDocument(existingDocs, {
      vehicleId,
      type: typeRaw,
      title,
      vendor,
      date,
      amount,
      pageHash,
    });

    if (duplicate) {
      console.info("[upload-document] duplicate document matched", {
        documentId: duplicate.id,
        vehicleId,
      });
      return {
        status: "duplicate",
        document: duplicate,
        tagUuid,
        message: buildDuplicateDocumentHint(duplicate),
      };
    }
  }

  const storagePath = `${vehicleId}/${documentId}-${safeName}`;

  const { error: storageError } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .upload(storagePath, bytes, {
      contentType: fileCheck.mime,
      upsert: false,
    });

  if (storageError) {
    return { status: "error", message: `Storage: ${storageError.message}` };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(DOCUMENT_BUCKET).getPublicUrl(storagePath);

  const baseRow = {
    id: documentId,
    vehicle_id: vehicleId,
    user_id: ownerUserId,
    created_by: user.id,
    title,
    type: typeRaw,
    file_url: publicUrl,
    amount,
    date,
  };

  const abeDetail = {
    authority,
    conditions,
    part_category: partCategory,
    notes,
    page_count: pageCount,
    manufacturer,
  };

  // Keep amount (baseRow) + mileage_km on every attempt that still has room for
  // optional columns — never drop KM just because an ABE-only column is missing.
  const insertAttempts = [
    {
      ...baseRow,
      vendor,
      category,
      line_items: lineItems,
      kba_number: kbaNumber,
      vehicle_approvals: vehicleApprovals,
      invoice_number: invoiceNumber,
      mileage_km: mileageKm,
      technical_specs: technicalSpecs,
      approval_fields: approvalFields,
      ...abeDetail,
    },
    {
      ...baseRow,
      vendor,
      category,
      line_items: lineItems,
      invoice_number: invoiceNumber,
      mileage_km: mileageKm,
      technical_specs: technicalSpecs,
      approval_fields: approvalFields,
    },
    {
      ...baseRow,
      vendor,
      category,
      line_items: lineItems,
      invoice_number: invoiceNumber,
      mileage_km: mileageKm,
      technical_specs: technicalSpecs,
    },
    {
      ...baseRow,
      vendor,
      category,
      line_items: lineItems,
      invoice_number: invoiceNumber,
      mileage_km: mileageKm,
    },
    {
      ...baseRow,
      vendor,
      category,
      line_items: lineItems,
      mileage_km: mileageKm,
    },
    {
      ...baseRow,
      vendor,
      category,
      line_items: lineItems,
      kba_number: kbaNumber,
      vehicle_approvals: vehicleApprovals,
      mileage_km: mileageKm,
      ...abeDetail,
    },
    {
      ...baseRow,
      vendor,
      category,
      line_items: lineItems,
      kba_number: kbaNumber,
      vehicle_approvals: vehicleApprovals,
      mileage_km: mileageKm,
      manufacturer,
    },
    {
      ...baseRow,
      vendor,
      category,
      line_items: lineItems,
      kba_number: kbaNumber,
      vehicle_approvals: vehicleApprovals,
      mileage_km: mileageKm,
    },
    { ...baseRow, vendor, category, line_items: lineItems, mileage_km: mileageKm },
    { ...baseRow, vendor, category, mileage_km: mileageKm },
    { ...baseRow, vendor, mileage_km: mileageKm },
    { ...baseRow, mileage_km: mileageKm },
    baseRow,
  ].flatMap((row) => {
    // Graceful if migration 00017 (created_by) is not applied yet.
    const { created_by: _createdBy, ...withoutCreatedBy } = row as typeof row & {
      created_by?: string;
    };
    return [row, withoutCreatedBy];
  });

  let document: Document | null = null;
  let insertError: { message: string } | null = null;

  for (const row of insertAttempts) {
    const result = await supabase
      .from("documents")
      .insert(row)
      .select("*")
      .single();
    if (!result.error && result.data) {
      document = {
        ...result.data,
        user_id:
          typeof result.data.user_id === "string"
            ? result.data.user_id
            : ownerUserId,
        vendor:
          typeof result.data.vendor === "string"
            ? result.data.vendor
            : vendor,
        category:
          typeof result.data.category === "string"
            ? result.data.category
            : category,
        line_items: parseLineItems(result.data.line_items) ?? lineItems,
        kba_number:
          typeof result.data.kba_number === "string"
            ? result.data.kba_number
            : kbaNumber,
        vehicle_approvals:
          parseStringList(result.data.vehicle_approvals) ?? vehicleApprovals,
        authority:
          typeof result.data.authority === "string"
            ? result.data.authority
            : authority,
        conditions: parseAbeConditions(result.data.conditions) ?? conditions,
        part_category:
          typeof result.data.part_category === "string"
            ? result.data.part_category
            : partCategory,
        notes: typeof result.data.notes === "string" ? result.data.notes : notes,
        page_count:
          typeof result.data.page_count === "number"
            ? result.data.page_count
            : pageCount,
        manufacturer:
          typeof result.data.manufacturer === "string"
            ? result.data.manufacturer
            : manufacturer,
        invoice_number:
          typeof result.data.invoice_number === "string"
            ? result.data.invoice_number
            : invoiceNumber,
        mileage_km:
          typeof result.data.mileage_km === "number"
            ? result.data.mileage_km
            : mileageKm,
        technical_specs:
          parseTechnicalSpecs(result.data.technical_specs) ?? technicalSpecs,
        approval_fields:
          parseApprovalFields(result.data.approval_fields) ?? approvalFields,
      };
      insertError = null;
      break;
    }
    insertError = result.error;
    if (
      !result.error?.message?.includes("does not exist") &&
      !result.error?.message?.includes("schema cache")
    ) {
      break;
    }
  }

  if (insertError || !document) {
    await supabase.storage.from(DOCUMENT_BUCKET).remove([storagePath]);
    return {
      status: "error",
      message: `Datenbank: ${insertError?.message ?? "Insert fehlgeschlagen"}`,
    };
  }

  revalidatePath(`/v/${tagUuid}`);
  revalidatePath(`/v/${tagUuid}/dokumente`);
  revalidatePath(`/v/${tagUuid}/historie`);
  revalidatePath(`/v/${tagUuid}/service`);
  revalidatePath(`/v/${tagUuid}/intervalle`);
  revalidatePath(`/v/${tagUuid}/eintrag`);

  return { status: "uploaded", document, tagUuid };
}
