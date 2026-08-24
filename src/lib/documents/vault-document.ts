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

import { DOCUMENT_BUCKET } from "./constants";
import { localDateIso, normalizeDocumentDateIso } from "./format";
import { guardDocumentTitle } from "./guard-document-title";
import { appendMockUploadedDocument } from "./mock-uploads";
import type { UploadDocumentResult } from "./upload-document";
import {
  VAULT_CATEGORIES,
  VAULT_DOCUMENT_TYPE_MARKER,
  isVaultDocumentKind,
  type VaultCategory,
  type VaultDocumentKind,
} from "@/lib/validations/vaultClassificationSchema";
import type { ApprovalFields } from "./approval-fields";

const stageVaultMetaSchema = z
  .object({
    vehicleId: z.string().uuid(),
    tagUuid: z.string().trim().min(1).max(128),
  })
  .strict();

const saveVaultMetaSchema = z
  .object({
    vehicleId: z.string().uuid(),
    tagUuid: z.string().trim().min(1).max(128),
    documentId: z.string().uuid(),
    title: z.string().trim().min(1).max(160),
    vaultCategory: z.enum(VAULT_CATEGORIES),
    vaultDocumentKind: z.string().trim().max(32).optional().default(""),
    fileUrl: z.string().trim().min(1).max(2_000),
    pageCount: z.string().trim().max(8).optional().default(""),
    date: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$|^$/)
      .optional()
      .default(""),
  })
  .strict();

export type StageVaultDocumentResult =
  | {
      status: "staged";
      documentId: string;
      fileUrl: string;
      tagUuid: string;
    }
  | { status: "error"; message: string };

function metaFromStageFormData(formData: FormData): unknown {
  return {
    vehicleId: String(formData.get("vehicleId") ?? "").trim(),
    tagUuid: String(formData.get("tagUuid") ?? "").trim(),
  };
}

function metaFromSaveFormData(formData: FormData): unknown {
  return {
    vehicleId: String(formData.get("vehicleId") ?? "").trim(),
    tagUuid: String(formData.get("tagUuid") ?? "").trim(),
    documentId: String(formData.get("documentId") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    vaultCategory: String(formData.get("vaultCategory") ?? "").trim(),
    vaultDocumentKind: String(formData.get("vaultDocumentKind") ?? "").trim(),
    fileUrl: String(formData.get("fileUrl") ?? "").trim(),
    pageCount: String(formData.get("pageCount") ?? "").trim(),
    date: String(formData.get("date") ?? "").trim(),
  };
}

function vaultApprovalFields(
  category: VaultCategory,
  documentKind: VaultDocumentKind | null,
): ApprovalFields {
  return {
    kind: "vault",
    data: {
      category,
      documentKind,
    },
  };
}

function parseVaultDocumentKind(raw: string): VaultDocumentKind | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return isVaultDocumentKind(trimmed) ? trimmed : null;
}

/**
 * Upload a Gutachten/ABE file to storage immediately — no DB row yet.
 */
export async function stageVaultDocument(
  formData: FormData,
): Promise<StageVaultDocumentResult> {
  const metaParsed = parseStrictBody(
    stageVaultMetaSchema,
    metaFromStageFormData(formData),
  );
  if (!metaParsed.ok) {
    return {
      status: "error",
      message: "Ungültige Upload-Daten.",
    };
  }

  const file = formData.get("file");
  if (!isUploadFile(file)) {
    return { status: "error", message: "Bitte eine Datei auswählen." };
  }

  const fileCheck = await validateDocumentUpload(file, { pdfOnly: true });
  if (!fileCheck.ok) {
    return { status: "error", message: fileCheck.error };
  }

  const { vehicleId, tagUuid } = metaParsed.data;
  const documentId = randomUUID();
  const safeName = fileCheck.safeName;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    if (tagUuid !== MOCK_TAG_UUIDS.active) {
      return {
        status: "error",
        message: "Mock-Upload nur für demo-active-tag.",
      };
    }
    return {
      status: "staged",
      documentId,
      fileUrl: `mock://upload/${documentId}/${safeName}`,
      tagUuid,
    };
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
      "abe",
    )
  ) {
    return {
      status: "error",
      message: "Schrauber können keine Gutachten/ABEs ablegen.",
    };
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

  return {
    status: "staged",
    documentId,
    fileUrl: publicUrl,
    tagUuid,
  };
}

/**
 * Persist a staged Tresor document after user review.
 */
export async function saveVaultDocument(
  formData: FormData,
): Promise<UploadDocumentResult> {
  const metaParsed = parseStrictBody(
    saveVaultMetaSchema,
    metaFromSaveFormData(formData),
  );
  if (!metaParsed.ok) {
    return {
      status: "error",
      message: "Ungültige Tresor-Daten.",
    };
  }

  const meta = metaParsed.data;
  const title = guardDocumentTitle(meta.title, "Gutachten / ABE");
  const documentKind = parseVaultDocumentKind(meta.vaultDocumentKind);
  const approvalFields = vaultApprovalFields(meta.vaultCategory, documentKind);
  const pageCountParsed = Number.parseInt(meta.pageCount, 10);
  const pageCount =
    Number.isFinite(pageCountParsed) && pageCountParsed > 0
      ? pageCountParsed
      : null;
  const scanDate =
    normalizeDocumentDateIso(meta.date) ?? localDateIso();
  const now = new Date().toISOString();

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    if (meta.tagUuid !== MOCK_TAG_UUIDS.active) {
      return {
        status: "error",
        message: "Mock-Upload nur für demo-active-tag.",
      };
    }

    const document: Document = {
      id: meta.documentId,
      vehicle_id: meta.vehicleId,
      user_id: "user_demo",
      created_by: "user_demo",
      title,
      type: "abe",
      file_url: meta.fileUrl,
      vendor: null,
      category: VAULT_DOCUMENT_TYPE_MARKER,
      line_items: null,
      kba_number: null,
      vehicle_approvals: null,
      authority: null,
      conditions: null,
      part_category: meta.vaultCategory,
      notes: null,
      page_count: pageCount,
      manufacturer: null,
      invoice_number: null,
      mileage_km: null,
      technical_specs: null,
      approval_fields: approvalFields,
      amount: null,
      date: scanDate,
      created_at: now,
      show_on_public_showcase: false,
    };

    await appendMockUploadedDocument(document);
    revalidatePath(`/v/${meta.tagUuid}`);
    revalidatePath(`/v/${meta.tagUuid}/dokumente`);
    return { status: "uploaded", document, tagUuid: meta.tagUuid };
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

  const supabase = createAdminClient();
  const writeAccess = await getVehicleWriteAccess(meta.vehicleId, user.id);
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
      "abe",
    )
  ) {
    return {
      status: "error",
      message: "Schrauber können keine Gutachten/ABEs ablegen.",
    };
  }

  const row = {
    id: meta.documentId,
    vehicle_id: meta.vehicleId,
    user_id: writeAccess.ownerUserId,
    created_by: user.id,
    title,
    type: "abe" as const,
    file_url: meta.fileUrl,
    category: VAULT_DOCUMENT_TYPE_MARKER,
    part_category: meta.vaultCategory,
    approval_fields: approvalFields,
    page_count: pageCount,
    amount: null,
    date: scanDate,
  };

  const insertAttempts: Array<Record<string, unknown>> = [
    row,
    {
      ...row,
      approval_fields: undefined,
    },
  ];

  let lastError: string | null = null;
  for (const attempt of insertAttempts) {
    const { data, error } = await supabase
      .from("documents")
      .insert(attempt)
      .select("*")
      .single();

    if (!error && data) {
      revalidatePath(`/v/${meta.tagUuid}`);
      revalidatePath(`/v/${meta.tagUuid}/dokumente`);
      revalidatePath(`/v/${meta.tagUuid}/umbauten`);
      return {
        status: "uploaded",
        document: data as Document,
        tagUuid: meta.tagUuid,
      };
    }
    lastError = error?.message ?? "Speichern fehlgeschlagen.";
  }

  return {
    status: "error",
    message: lastError ?? "Speichern fehlgeschlagen.",
  };
}
