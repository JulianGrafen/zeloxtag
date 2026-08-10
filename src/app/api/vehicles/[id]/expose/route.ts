import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { assertVehicleOwner } from "@/lib/vehicles/assert-owner";
import { buildExposePdfData } from "@/lib/vehicles/expose-pdf/build-expose-data";
import { sanitizePdfFilename } from "@/lib/vehicles/expose-pdf/formatters";
import { generateExposeQrDataUri } from "@/lib/vehicles/expose-pdf/generate-qr";
import { renderExposePdfBuffer } from "@/lib/vehicles/expose-pdf/render-expose-pdf";
import {
  enforceRateLimit,
  requireApiUser,
} from "@/lib/security/api-guard";
import { TimelineService } from "@/services/timeline/TimelineService";
import { createClient } from "@/lib/supabase/server";
import type { Document, Vehicle } from "@/types/database";

export const runtime = "nodejs";

const vehicleIdSchema = z.string().uuid();

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const limited = await enforceRateLimit(request, "apiDefault", "vehicle-expose");
  if (limited) return limited;

  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;

  const { id: rawId } = await context.params;
  const parsedId = vehicleIdSchema.safeParse(rawId);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid vehicle id." }, { status: 400 });
  }

  const vehicleId = parsedId.data;
  const ownership = await assertVehicleOwner(vehicleId);
  if (!ownership.ok) {
    const status =
      ownership.reason === "unauthorized"
        ? 401
        : ownership.reason === "forbidden"
          ? 403
          : ownership.reason === "unconfigured"
            ? 503
            : 404;
    return NextResponse.json({ error: ownership.message }, { status });
  }

  try {
    const supabase = await createClient();
    const [{ data: vehicle, error: vehicleError }, { data: documents, error: docsError }] =
      await Promise.all([
        supabase
          .from("vehicles")
          .select("*")
          .eq("id", vehicleId)
          .eq("user_id", ownership.userId)
          .maybeSingle(),
        supabase
          .from("documents")
          .select("*")
          .eq("vehicle_id", vehicleId)
          .order("created_at", { ascending: false }),
      ]);

    if (vehicleError || !vehicle) {
      return NextResponse.json(
        { error: vehicleError?.message ?? "Vehicle not found." },
        { status: 404 },
      );
    }
    if (docsError) {
      return NextResponse.json({ error: docsError.message }, { status: 500 });
    }

    const timelineService = new TimelineService(supabase);
    const timeline = await timelineService.getTimelineForVehicle(
      vehicleId,
      (documents ?? []) as Document[],
      "desc",
    );

    const qrCodeDataUri = await generateExposeQrDataUri(
      (vehicle as Vehicle).public_slug,
    );

    const sellerContact =
      auth.user.email?.trim() ||
      (typeof auth.user.user_metadata?.full_name === "string"
        ? auth.user.user_metadata.full_name.trim()
        : "") ||
      "ZeloxTag Fahrzeughalter";

    const exposeData = await buildExposePdfData({
      vehicle: vehicle as Vehicle,
      documents: (documents ?? []) as Document[],
      timeline,
      sellerContact,
      qrCodeDataUri,
    });

    const pdfBuffer = await renderExposePdfBuffer(exposeData);
    const filename = sanitizePdfFilename(exposeData.vehicleTitle);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[vehicle-expose] PDF generation failed", error);
    return NextResponse.json(
      { error: "PDF generation failed." },
      { status: 500 },
    );
  }
}
