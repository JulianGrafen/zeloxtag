import { randomUUID } from "crypto";

import {
  contributorMayWriteDocumentType,
  getVehicleWriteAccess,
  writeAccessErrorMessage,
} from "@/lib/auth/vehicle-write-access";
import { DOCUMENT_BUCKET } from "@/lib/documents/constants";
import { FEATURE } from "@/lib/permissions/feature-access";
import { assertOwnerFeature } from "@/lib/permissions/require-feature";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import type { Document, DocumentType } from "@/types/database";

import type { InvoiceOcrCategory, InvoiceOcrFields } from "./types";

export class OcrPersistError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OcrPersistError";
  }
}

export type PersistedOcrDocument = Document & {
  /** App-level OCR category (not persisted as a DB column in 00001). */
  category: InvoiceOcrCategory;
};

function documentTypeForCategory(category: InvoiceOcrCategory): DocumentType {
  return category === "inspection" ? "tuev" : "invoice";
}

function sanitizeFilename(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
}

/**
 * Uploads the invoice image to Supabase Storage and inserts a documents row.
 * Call only after OCR succeeded.
 */
export async function persistOcrInvoice(input: {
  vehicleId: string;
  userId: string;
  bytes: Buffer;
  mimeType: string;
  originalName: string;
  ocr: InvoiceOcrFields;
}): Promise<PersistedOcrDocument> {
  if (!isSupabaseAdminConfigured()) {
    throw new OcrPersistError("SUPABASE_SERVICE_ROLE_KEY fehlt.");
  }

  const writeAccess = await getVehicleWriteAccess(
    input.vehicleId,
    input.userId,
  );
  if (!writeAccess.ok || !writeAccess.ownerUserId) {
    throw new OcrPersistError(writeAccessErrorMessage(writeAccess));
  }
  const vault = await assertOwnerFeature(
    writeAccess.ownerUserId,
    FEATURE.SCAN_AI_RECEIPT,
  );
  if (!vault.ok) {
    throw new OcrPersistError(vault.message);
  }

  const documentId = randomUUID();
  const safeName = sanitizeFilename(input.originalName || "invoice.jpg");
  const storagePath = `${input.vehicleId}/${documentId}-${safeName}`;
  const docType = documentTypeForCategory(input.ocr.category);

  if (
    !contributorMayWriteDocumentType(
      writeAccess.isContributor,
      writeAccess.isOwner,
      docType,
    )
  ) {
    throw new OcrPersistError(
      "Schrauber können nur Rechnungen und Service-Belege speichern.",
    );
  }

  const supabase = createAdminClient();

  const { error: storageError } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .upload(storagePath, input.bytes, {
      contentType: input.mimeType,
      upsert: false,
    });

  if (storageError) {
    throw new OcrPersistError(`Storage upload failed: ${storageError.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(DOCUMENT_BUCKET).getPublicUrl(storagePath);

  const vendor = input.ocr.vendor?.trim().slice(0, 160) || null;
  const title = (vendor || "Rechnung").slice(0, 160);
  const category = input.ocr.category;

  const row = {
    id: documentId,
    vehicle_id: input.vehicleId,
    user_id: writeAccess.ownerUserId,
    created_by: input.userId,
    title,
    type: docType,
    file_url: publicUrl,
    vendor,
    category,
    line_items: null,
    kba_number: null,
    vehicle_approvals: null,
    authority: null,
    conditions: null,
    part_category: null,
    notes: null,
    page_count: null,
    manufacturer: null,
    invoice_number: null,
    mileage_km: null,
    technical_specs: null,
    approval_fields: null,
    amount: input.ocr.amount,
    date: input.ocr.date,
  };

  let document = null;
  let insertError: { message: string } | null = null;
  for (const attempt of [
    row,
    (() => {
      const { created_by: _c, ...rest } = row;
      return rest;
    })(),
  ]) {
    const result = await supabase
      .from("documents")
      .insert(attempt)
      .select("*")
      .single();
    if (!result.error && result.data) {
      document = result.data;
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
    throw new OcrPersistError(
      `Database insert failed: ${insertError?.message ?? "unknown error"}`,
    );
  }

  return {
    ...document,
    line_items: document.line_items ?? null,
    kba_number: document.kba_number ?? null,
    vehicle_approvals: document.vehicle_approvals ?? null,
    authority: document.authority ?? null,
    conditions: document.conditions ?? null,
    part_category: document.part_category ?? null,
    notes: document.notes ?? null,
    page_count: document.page_count ?? null,
    manufacturer: document.manufacturer ?? null,
    invoice_number: document.invoice_number ?? null,
    mileage_km: document.mileage_km ?? null,
    technical_specs: document.technical_specs ?? null,
    approval_fields: document.approval_fields ?? null,
    category: input.ocr.category,
  };
}
