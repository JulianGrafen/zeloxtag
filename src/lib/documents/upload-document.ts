"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-user";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
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
import { normalizeMileageKm } from "@/lib/ocr/text-parse-schema";

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
  const normalized = raw.replace(/\s/g, "").replace(",", ".");
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}

function parseDate(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  return raw;
}

function ensurePdfFilename(name: string): string {
  const safe = sanitizeFilename(name || "dokument.pdf");
  return safe.toLowerCase().endsWith(".pdf") ? safe : `${safe.replace(/\.[^.]+$/, "")}.pdf`;
}

/**
 * Persist a document PDF to Supabase Storage + documents row.
 * Without Supabase env → mock metadata cookie (local demo).
 * With service role (auth deferred) → admin upload when no session.
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
  const vehicleApprovals = parseStringList(vehicleApprovalsRaw, {
    maxItemLength: 160,
    maxItems: 40,
  });
  const authority = authorityRaw.slice(0, 120) || null;
  const conditions = parseAbeConditions(conditionsRaw);
  const partCategory = partCategoryRaw.slice(0, 60) || null;
  const notes = notesRaw.slice(0, 500) || null;
  const manufacturer = manufacturerRaw.slice(0, 120) || null;
  const invoiceNumber = invoiceNumberRaw.slice(0, 80) || null;
  const mileageKm = normalizeMileageKm(
    mileageKmRaw ? Number.parseInt(mileageKmRaw.replace(/\D/g, ""), 10) : null,
  );
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
  const useAdmin = !user && isSupabaseAdminConfigured();

  if (!user && !useAdmin) {
    return {
      status: "error",
      message:
        "Bitte zuerst anmelden — oder SUPABASE_SERVICE_ROLE_KEY setzen (Auth noch deaktiviert).",
    };
  }

  // Always use one client type to keep Supabase generics happy.
  if (!isSupabaseAdminConfigured() && !user) {
    return { status: "error", message: "Supabase Admin fehlt." };
  }
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
  if (user && vehicle.user_id !== user.id) {
    return { status: "error", message: "Kein Schreibzugriff auf dieses Fahrzeug." };
  }

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
    title,
    type: typeRaw,
    file_url: publicUrl,
    amount,
    date,
  };

  // Prefer keeping ABE columns across schema-cache fallbacks. Never drop
  // kba/freigaben/auflagen/manufacturer just because mileage_km is missing.
  const abeCore = {
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
  };

  const insertAttempts = [
    {
      ...baseRow,
      ...abeCore,
      invoice_number: invoiceNumber,
      mileage_km: mileageKm,
    },
    {
      ...baseRow,
      ...abeCore,
      invoice_number: invoiceNumber,
    },
    {
      ...baseRow,
      ...abeCore,
    },
    {
      ...baseRow,
      vendor,
      category,
      line_items: lineItems,
      kba_number: kbaNumber,
      vehicle_approvals: vehicleApprovals,
      manufacturer,
      conditions,
      authority,
      part_category: partCategory,
    },
    {
      ...baseRow,
      vendor,
      category,
      line_items: lineItems,
      kba_number: kbaNumber,
      vehicle_approvals: vehicleApprovals,
      manufacturer,
      conditions,
    },
    {
      ...baseRow,
      vendor,
      category,
      line_items: lineItems,
      kba_number: kbaNumber,
      vehicle_approvals: vehicleApprovals,
      manufacturer,
    },
    {
      ...baseRow,
      vendor,
      category,
      line_items: lineItems,
      kba_number: kbaNumber,
      vehicle_approvals: vehicleApprovals,
    },
    {
      ...baseRow,
      vendor,
      category,
      line_items: lineItems,
      invoice_number: invoiceNumber,
      mileage_km: mileageKm,
    },
    { ...baseRow, vendor, category, line_items: lineItems },
    { ...baseRow, vendor, category },
    { ...baseRow, vendor },
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
          parseStringList(result.data.vehicle_approvals, {
            maxItemLength: 160,
            maxItems: 40,
          }) ?? vehicleApprovals,
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
