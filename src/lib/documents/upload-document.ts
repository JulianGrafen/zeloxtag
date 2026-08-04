"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-user";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { MOCK_TAG_UUIDS } from "@/lib/tags/mock-tags";
import type { Document, DocumentType } from "@/types/database";

import {
  DOCUMENT_BUCKET,
  DOCUMENT_TYPE_OPTIONS,
  MAX_DOCUMENT_BYTES,
} from "./constants";
import { parseLineItems } from "./line-items";
import { appendMockUploadedDocument } from "./mock-uploads";
import { parseAbeConditions, parseStringList } from "./string-list";
import { parseTechnicalSpecs } from "./technical-specs";

export type UploadDocumentResult =
  | { status: "uploaded"; document: Document; tagUuid: string }
  | { status: "error"; message: string };

function isDocumentType(value: string): value is DocumentType {
  return (DOCUMENT_TYPE_OPTIONS as string[]).includes(value);
}

function sanitizeFilename(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
}

function parseAmount(raw: string | undefined): number | null {
  if (!raw?.trim()) return null;
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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  return raw;
}

function parseMileageKm(raw: string | undefined): number | null {
  if (!raw?.trim()) return null;
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  const value = Number.parseInt(digits, 10);
  if (!Number.isFinite(value) || value < 0 || value > 9_999_999) return null;
  return value;
}

function ensurePdfFilename(name: string): string {
  const safe = sanitizeFilename(name || "dokument.pdf");
  return safe.toLowerCase().endsWith(".pdf") ? safe : `${safe.replace(/\.[^.]+$/, "")}.pdf`;
}

/**
 * Persist a document PDF to Supabase Storage + documents row.
 * Without Supabase env → mock metadata cookie (local demo).
 * With service role (auth deferred for QR scan UX) → admin upload when no session.
 */
export async function uploadDocument(
  formData: FormData,
): Promise<UploadDocumentResult> {
  const vehicleId = String(formData.get("vehicleId") ?? "").trim();
  const tagUuid = String(formData.get("tagUuid") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const typeRaw = String(formData.get("type") ?? "").trim();
  const vendorRaw = String(formData.get("vendor") ?? "").trim();
  const categoryRaw = String(formData.get("category") ?? "").trim();
  const lineItemsRaw = String(formData.get("lineItems") ?? "");
  const kbaNumberRaw = String(formData.get("kbaNumber") ?? "").trim();
  const vehicleApprovalsRaw = String(formData.get("vehicleApprovals") ?? "");
  const authorityRaw = String(formData.get("authority") ?? "").trim();
  const conditionsRaw = String(formData.get("conditions") ?? "");
  const technicalSpecsRaw = String(formData.get("technicalSpecs") ?? "");
  const partCategoryRaw = String(formData.get("partCategory") ?? "").trim();
  const notesRaw = String(formData.get("notes") ?? "").trim();
  const manufacturerRaw = String(formData.get("manufacturer") ?? "").trim();
  const invoiceNumberRaw = String(formData.get("invoiceNumber") ?? "").trim();
  const mileageKmRaw = String(formData.get("mileageKm") ?? "").trim();
  const pageCountRaw = String(formData.get("pageCount") ?? "").trim();
  const dateRaw = String(formData.get("date") ?? "");
  const amountRaw = String(formData.get("amount") ?? "");
  const file = formData.get("file");

  if (!vehicleId || !tagUuid) {
    return { status: "error", message: "Fahrzeug- oder Tag-Bezug fehlt." };
  }
  if (!title) {
    return { status: "error", message: "Titel ist erforderlich." };
  }
  if (!isDocumentType(typeRaw)) {
    return { status: "error", message: "Ungültiger Dokumenttyp." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Bitte eine Datei auswählen." };
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return {
      status: "error",
      message: `Datei zu groß (max. ${Math.round(MAX_DOCUMENT_BYTES / (1024 * 1024))} MB).`,
    };
  }

  const isPdf =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    return {
      status: "error",
      message: "Nur PDF-Dateien können gespeichert werden.",
    };
  }

  const amount = parseAmount(amountRaw);
  const date = parseDate(dateRaw);
  const vendor = vendorRaw.slice(0, 160) || null;
  const category = categoryRaw.slice(0, 40) || null;
  const lineItems = parseLineItems(lineItemsRaw);
  const kbaNumber = kbaNumberRaw.slice(0, 80) || null;
  const vehicleApprovals = parseStringList(vehicleApprovalsRaw);
  const authority = authorityRaw.slice(0, 120) || null;
  const conditions = parseAbeConditions(conditionsRaw);
  const technicalSpecs = parseTechnicalSpecs(technicalSpecsRaw);
  const partCategory = partCategoryRaw.slice(0, 60) || null;
  const notes = notesRaw.slice(0, 500) || null;
  const manufacturer = manufacturerRaw.slice(0, 120) || null;
  const invoiceNumber = invoiceNumberRaw.slice(0, 80) || null;
  const mileageKm = parseMileageKm(mileageKmRaw);
  const pageCountParsed = Number.parseInt(pageCountRaw, 10);
  const pageCount =
    Number.isFinite(pageCountParsed) && pageCountParsed > 0
      ? pageCountParsed
      : null;
  const documentId = randomUUID();
  const safeName = ensurePdfFilename(file.name || "dokument.pdf");
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
      amount,
      date,
      created_at: now,
    };

    await appendMockUploadedDocument(document);
    revalidatePath(`/v/${tagUuid}`);
    revalidatePath(`/v/${tagUuid}/dokumente`);
    revalidatePath(`/v/${tagUuid}/service`);
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

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .select("id, user_id")
    .eq("id", vehicleId)
    .maybeSingle();

  if (vehicleError) {
    return { status: "error", message: vehicleError.message };
  }
  if (!vehicle) {
    return { status: "error", message: "Fahrzeug nicht gefunden." };
  }
  if (vehicle.user_id !== user.id) {
    return {
      status: "error",
      message:
        "Dieses Fahrzeug gehört zu einem anderen Konto. Bitte abmelden und mit dem richtigen Konto anmelden.",
    };
  }

  const ownerUserId = user.id;

  const storagePath = `${vehicleId}/${documentId}-${safeName}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: storageError } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .upload(storagePath, bytes, {
      contentType: "application/pdf",
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
  ];

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
  revalidatePath(`/v/${tagUuid}/service`);

  return { status: "uploaded", document, tagUuid };
}
