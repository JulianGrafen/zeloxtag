import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { loadBuildPlannerVehicleContextBundle } from "@/lib/build-planner/build-planner-vehicle-context";
import {
  BuildPlannerExtractError,
  extractPlannedModFromImage,
  extractPlannedModFromLink,
  extractPlannedModFromText,
} from "@/lib/build-planner/extract-service";
import { isLlmConfigured } from "@/lib/ocr/llm-client";
import { FEATURE } from "@/lib/permissions/feature-access";
import { assertOwnerFeature } from "@/lib/permissions/require-feature";
import {
  enforceRateLimit,
  enforceSameOrigin,
  requireWritableApiUser,
  subscriptionRequiredResponse,
} from "@/lib/security/api-guard";
import { validateDocumentUpload } from "@/lib/security/file-upload";
import { logServerError } from "@/lib/security/public-error";
import { getVehicleWriteAccess } from "@/lib/auth/vehicle-write-access";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 12 * 1024 * 1024;

const jsonBodySchema = z
  .object({
    vehicleId: z.string().uuid(),
    tagUuid: z.string().trim().min(1).max(128).optional(),
    sourceUrl: z.string().trim().url().max(2048).optional(),
    text: z.string().trim().min(8).max(12_000).optional(),
  })
  .strict();

type ExtractSuccess = {
  ok: true;
  extract: Awaited<
    ReturnType<typeof extractPlannedModFromText>
  >["result"];
  modelId: string;
};

type ExtractErrorCode =
  | "unauthorized"
  | "forbidden"
  | "bad_request"
  | "config"
  | "extract_failed"
  | "link_fetch_blocked"
  | "rate_limited";

function jsonError(status: number, error: string, code: ExtractErrorCode) {
  return NextResponse.json({ ok: false, error, code }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const limited = await enforceRateLimit(request, "buildPlanner", "extract");
    if (limited) return limited;

    const auth = await requireWritableApiUser();
    if (!auth.ok) return auth.response;

    if (!isLlmConfigured()) {
      return jsonError(
        503,
        "Build Planner KI ist nicht vollständig konfiguriert.",
        "config",
      );
    }

    const contentType = request.headers.get("content-type") ?? "";
    const isMultipart = contentType.includes("multipart/form-data");

    let vehicleId = "";
    let sourceUrl: string | undefined;
    let text: string | undefined;
    let imageFile: File | null = null;

    if (isMultipart) {
      let formData: FormData;
      try {
        formData = await request.formData();
      } catch {
        return jsonError(400, "Multipart erwartet.", "bad_request");
      }

      vehicleId = String(formData.get("vehicleId") ?? "").trim();
      const urlRaw = String(formData.get("sourceUrl") ?? "").trim();
      const textRaw = String(formData.get("text") ?? "").trim();
      const image = formData.get("image");
      if (image instanceof File && image.size > 0) {
        imageFile = image;
      }
      if (urlRaw) sourceUrl = urlRaw;
      if (textRaw) text = textRaw;
    } else {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return jsonError(400, "JSON oder Multipart erwartet.", "bad_request");
      }
      const parsed = jsonBodySchema.safeParse(body);
      if (!parsed.success) {
        return jsonError(400, "vehicleId ist erforderlich.", "bad_request");
      }
      vehicleId = parsed.data.vehicleId;
      sourceUrl = parsed.data.sourceUrl;
      text = parsed.data.text;
    }

    if (!z.string().uuid().safeParse(vehicleId).success) {
      return jsonError(400, "vehicleId (UUID) ist erforderlich.", "bad_request");
    }

    const access = await getVehicleWriteAccess(vehicleId, auth.user.id);
    if (!access.ok || !access.isOwner || !access.ownerUserId) {
      return jsonError(403, "Nur der Halter kann extrahieren.", "forbidden");
    }

    const feature = await assertOwnerFeature(
      access.ownerUserId,
      FEATURE.USE_BUILD_PLANNER_AI,
    );
    if (!feature.ok) {
      return subscriptionRequiredResponse(feature.message, feature.code);
    }

    const sources = [
      sourceUrl ? "url" : null,
      text ? "text" : null,
      imageFile ? "image" : null,
    ].filter(Boolean);

    if (sources.length !== 1) {
      return jsonError(
        400,
        "Genau eine Quelle: Link, Text oder Bild.",
        "bad_request",
      );
    }

    const userGoalText = text ?? sourceUrl ?? undefined;
    const contextBundle = await loadBuildPlannerVehicleContextBundle(
      vehicleId,
      access.ownerUserId,
      userGoalText,
    );
    const extractOptions = {
      vehicleContext: contextBundle.promptText,
      ...(contextBundle.profile
        ? {
            salvage: {
              profile: contextBundle.profile,
              userText: text ?? sourceUrl ?? "Bild",
            },
          }
        : {}),
    };

    let extracted: ExtractSuccess;
    try {
      if (sourceUrl) {
        const out = await extractPlannedModFromLink(
          sourceUrl,
          extractOptions,
        );
        extracted = {
          ok: true,
          extract: out.result,
          modelId: out.model,
        };
      } else if (text) {
        const out = await extractPlannedModFromText(text, extractOptions);
        extracted = {
          ok: true,
          extract: out.result,
          modelId: out.model,
        };
      } else if (imageFile) {
        const validated = await validateDocumentUpload(imageFile, {
          maxBytes: MAX_BYTES,
        });
        if (!validated.ok) {
          return jsonError(400, validated.error, "bad_request");
        }
        if (!validated.mime.startsWith("image/")) {
          return jsonError(400, "Nur Bilddateien erlaubt.", "bad_request");
        }
        const out = await extractPlannedModFromImage(
          {
            bytes: Buffer.from(validated.bytes),
            mimeType: validated.mime,
          },
          extractOptions,
        );
        extracted = {
          ok: true,
          extract: out.result,
          modelId: out.model,
        };
      } else {
        return jsonError(400, "Quelle fehlt.", "bad_request");
      }
    } catch (error) {
      if (error instanceof BuildPlannerExtractError) {
        if (error.code === "config") {
          return jsonError(503, error.message, "config");
        }
        if (error.code === "blocked") {
          return jsonError(400, error.message, "link_fetch_blocked");
        }
        return jsonError(422, error.message, "extract_failed");
      }
      logServerError("[build-planner/extract] failed", error);
      const hint =
        error instanceof Error && error.message.trim()
          ? error.message
          : "Extraktion fehlgeschlagen. Versuche Text oder Screenshot.";
      return jsonError(422, hint, "extract_failed");
    }

    return NextResponse.json(extracted);
  } catch (error) {
    logServerError("[build-planner/extract] unexpected", error);
    return jsonError(500, "Extraktion fehlgeschlagen.", "extract_failed");
  }
}
