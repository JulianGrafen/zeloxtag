import {
  FREE_SCAN_EXHAUSTED_CODE,
  SUBSCRIPTION_REQUIRED_CODE,
} from "@/lib/permissions/feature-access";
import type { StageVaultDocumentResult } from "@/lib/documents/vault-document";

type StageVaultApiSuccess = {
  ok: true;
  documentId: string;
  fileUrl: string;
  tagUuid: string;
};

type StageVaultApiFailure = {
  ok: false;
  error: string;
  code?: string;
};

function mapApiFailure(payload: StageVaultApiFailure): StageVaultDocumentResult {
  if (payload.code === "subscription_required") {
    return {
      status: "forbidden",
      message: payload.error,
      code: SUBSCRIPTION_REQUIRED_CODE,
    };
  }
  if (payload.code === "free_scan_exhausted") {
    return {
      status: "forbidden",
      message: payload.error,
      code: FREE_SCAN_EXHAUSTED_CODE,
    };
  }
  if (payload.code === "forbidden") {
    return {
      status: "forbidden",
      message: payload.error,
      code: SUBSCRIPTION_REQUIRED_CODE,
    };
  }
  return { status: "error", message: payload.error || "Hochladen fehlgeschlagen." };
}

/**
 * Stage a Tresor PDF via API (avoids large Server Action multipart parsing).
 */
export async function stageVaultDocumentViaApi(
  vehicleId: string,
  tagUuid: string,
  file: File,
): Promise<StageVaultDocumentResult> {
  const formData = new FormData();
  formData.set("vehicleId", vehicleId);
  formData.set("tagUuid", tagUuid);
  formData.set("file", file);

  const response = await fetch("/api/documents/vault-stage", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json().catch(() => null)) as
    | StageVaultApiSuccess
    | StageVaultApiFailure
    | null;

  if (!payload) {
    return {
      status: "error",
      message: `Hochladen fehlgeschlagen (${response.status}).`,
    };
  }

  if (payload.ok === true) {
    return {
      status: "staged",
      documentId: payload.documentId,
      fileUrl: payload.fileUrl,
      tagUuid: payload.tagUuid,
    };
  }

  return mapApiFailure(payload);
}
