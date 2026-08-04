import { randomUUID } from "crypto";

import { DOCUMENT_BUCKET } from "@/lib/documents/constants";
import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .select("id, user_id")
    .eq("id", input.vehicleId)
    .maybeSingle();

  if (vehicleError) {
    throw new OcrPersistError(vehicleError.message);
  }
  if (!vehicle || vehicle.user_id !== input.userId) {
    throw new OcrPersistError("No write access to this vehicle.");
  }

  const documentId = randomUUID();
  const safeName = sanitizeFilename(input.originalName || "invoice.jpg");
  const storagePath = `${input.vehicleId}/${documentId}-${safeName}`;
  const docType = documentTypeForCategory(input.ocr.category);

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

  const { data: document, error: insertError } = await supabase
    .from("documents")
    .insert({
      id: documentId,
      vehicle_id: input.vehicleId,
      user_id: input.userId,
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
    })
    .select("*")
    .single();

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
