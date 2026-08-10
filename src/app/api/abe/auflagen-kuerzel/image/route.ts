import { NextResponse, type NextRequest } from "next/server";

import { normalizeAuflagenKuerzel } from "@/lib/ocr/auflagen-kuerzel-db";
import { uploadAuflagenKuerzelImage } from "@/lib/ocr/auflagen-kuerzel-store";
import {
  enforceRateLimit,
  enforceSameOrigin,
  requireApiUser,
} from "@/lib/security/api-guard";
import { sniffAllowedMime } from "@/lib/security/file-upload";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;

/** POST /api/abe/auflagen-kuerzel/image — upload cropped Auflagen snippet. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const limited = await enforceRateLimit(
      request,
      "upload",
      "auflagen-kuerzel-image",
    );
    if (limited) return limited;

    const auth = await requireApiUser();
    if (!auth.ok) return auth.response;

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Expected multipart form data." },
        { status: 400 },
      );
    }

    const kuerzel = normalizeAuflagenKuerzel(
      String(formData.get("kuerzel") ?? ""),
    );
    if (!kuerzel) {
      return NextResponse.json(
        { ok: false, error: "Kürzel fehlt." },
        { status: 400 },
      );
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "Bild fehlt." },
        { status: 400 },
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: "Bild ist zu groß (max. 5 MB)." },
        { status: 400 },
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const mime = sniffAllowedMime(bytes);
    if (!mime || !mime.startsWith("image/")) {
      return NextResponse.json(
        { ok: false, error: "Nur Bilddateien erlaubt." },
        { status: 400 },
      );
    }

    const { imagePath, imageUrl } = await uploadAuflagenKuerzelImage(
      kuerzel,
      bytes,
      mime,
      auth.user.id,
    );

    return NextResponse.json({
      ok: true,
      kuerzel,
      imagePath,
      imageUrl,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "Auflagen-Bild konnte nicht gespeichert werden.",
      },
      { status: 500 },
    );
  }
}
