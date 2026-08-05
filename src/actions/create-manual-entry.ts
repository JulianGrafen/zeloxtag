"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/get-user";
import {
  contributorMayWriteDocumentType,
  getVehicleWriteAccess,
} from "@/lib/auth/vehicle-write-access";
import {
  MANUAL_ENTRY_CATEGORIES,
  type ManualEntryCategory,
} from "@/lib/documents/manual-entries";
import { appendMockUploadedDocument } from "@/lib/documents/mock-uploads";
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

const inputSchema = z.object({
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

/**
 * Persist a user-written Wartung / Tuning log without a scanned PDF.
 */
export async function createManualVehicleEntry(
  input: z.infer<typeof inputSchema>,
): Promise<CreateManualEntryResult> {
  const parsed = inputSchema.safeParse(input);
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
  const fileUrl = `manual://entry/${documentId}`;

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    if (data.tagUuid !== MOCK_TAG_UUIDS.active) {
      return {
        status: "error",
        message: "Mock-Eintrag nur für demo-active-tag.",
      };
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
      page_count: null,
      manufacturer: null,
      invoice_number: null,
      mileage_km: mileageKm,
      technical_specs: null,
      approval_fields: null,
      amount,
      date,
      created_at: now,
    };
    await appendMockUploadedDocument(document);
    revalidatePath(`/v/${data.tagUuid}`);
    revalidatePath(`/v/${data.tagUuid}/eintrag`);
    revalidatePath(`/v/${data.tagUuid}/service`);
    revalidatePath(`/v/${data.tagUuid}/dokumente`);
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
    mileage_km: mileageKm,
    amount,
    date,
  };

  const { error } = await admin.from("documents").insert(row);
  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath(`/v/${data.tagUuid}`);
  revalidatePath(`/v/${data.tagUuid}/eintrag`);
  revalidatePath(`/v/${data.tagUuid}/service`);
  revalidatePath(`/v/${data.tagUuid}/dokumente`);
  revalidatePath(`/v/${data.tagUuid}/intervalle`);

  return { status: "created", documentId };
}
