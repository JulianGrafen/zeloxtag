import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { DOCUMENT_BUCKET } from "@/lib/documents/constants";
import { documentMediaKind } from "@/lib/documents/viewable-url";
import { isManualVehicleEntry } from "@/lib/documents/manual-entries";
import { enforceRateLimit } from "@/lib/security/api-guard";
import { storagePathFromPublicOrAuthenticatedUrl } from "@/lib/security/file-upload";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { isVehicleDynoChartStoragePath } from "@/lib/vehicles/dyno-chart-constants";
import { isVehiclePublicShowcase } from "@/lib/vehicles/get-public-vehicle";

export const runtime = "nodejs";

const vehicleIdSchema = z.string().uuid();
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const querySchema = z
  .object({
    src: z.string().trim().min(1).max(2048),
  })
  .strict();

/**
 * Public showcase media proxy — images + dyno chart only when is_public.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ vehicleId: string }> },
) {
  const limited = await enforceRateLimit(
    request,
    "apiDefault",
    "public-vehicle-file",
  );
  if (limited) return limited;

  const { vehicleId: rawVehicleId } = await context.params;
  const vehicleParsed = vehicleIdSchema.safeParse(rawVehicleId);
  if (!vehicleParsed.success) {
    return NextResponse.json({ error: "Invalid vehicle id." }, { status: 400 });
  }

  const queryParsed = querySchema.safeParse({
    src: request.nextUrl.searchParams.get("src")?.trim() ?? "",
  });
  if (!queryParsed.success) {
    return NextResponse.json({ error: "src is required." }, { status: 400 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Storage not configured." }, { status: 503 });
  }

  const vehicleId = vehicleParsed.data;
  const src = queryParsed.data.src;

  try {
    const isPublic = await isVehiclePublicShowcase(vehicleId);
    if (!isPublic) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const storagePath = storagePathFromPublicOrAuthenticatedUrl(src, DOCUMENT_BUCKET);
    if (!storagePath || !storagePath.startsWith(`${vehicleId}/`)) {
      return NextResponse.json({ error: "Source not allowed." }, { status: 403 });
    }

    const mediaKind = documentMediaKind(src);
    const dyno = isVehicleDynoChartStoragePath(storagePath);

    if (!dyno && mediaKind !== "image") {
      return NextResponse.json({ error: "Media type not allowed." }, { status: 403 });
    }

    if (!dyno) {
      const documentId = storagePath.split("/")[1]?.slice(0, 36) ?? "";
      if (!UUID_RE.test(documentId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const admin = createAdminClient();
      const { data: doc } = await admin
        .from("documents")
        .select("id, category, invoice_number, file_url, type")
        .eq("id", documentId)
        .eq("vehicle_id", vehicleId)
        .maybeSingle();

      const allowedManual =
        doc &&
        isManualVehicleEntry(doc as Parameters<typeof isManualVehicleEntry>[0]) &&
        doc.category === "tuning";

      if (!allowedManual) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from(DOCUMENT_BUCKET)
      .download(storagePath);

    if (error || !data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    const contentType =
      data.type?.split(";")[0]?.trim() ||
      (dyno ? "application/pdf" : "image/jpeg");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": "inline",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid src" }, { status: 400 });
  }
}
