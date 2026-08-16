import { NextResponse, type NextRequest } from "next/server";

import { normalizeAuflagenKuerzel } from "@/lib/ocr/auflagen-kuerzel-db";
import {
  downloadAuflagenKuerzelImage,
  uploadAuflagenKuerzelImage,
} from "@/lib/ocr/auflagen-kuerzel-store";
import {
  enforceRateLimit,
  enforceSameOrigin,
  requireApiUser,
} from "@/lib/security/api-guard";
import { sniffAllowedMime } from "@/lib/security/file-upload";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;

/** GET /api/abe/auflagen-kuerzel/image?kuerzel=744 — paper snippet bytes. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const limited = await enforceRateLimit(
      request,
      "apiDefault",
      "auflagen-kuerzel-image-read",
    );
    if (limited) return limited;

    const kuerzel = normalizeAuflagenKuerzel(
      request.nextUrl.searchParams.get("kuerzel") ?? "",
    );
    if (!kuerzel) {
      return NextResponse.json(
        { ok: false, error: "Kürzel fehlt." },
        { status: 400 },
      );
    }

    const image = await downloadAuflagenKuerzelImage(kuerzel);
    if (!image) {
      return new NextResponse(null, { status: 404 });
    }

    return new NextResponse(new Uint8Array(image.bytes), {
      status: 200,
      headers: {
        "Content-Type": image.contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err) {
    console.error("[auflagen-kuerzel/image] read failed", err);
    return NextResponse.json(
      { ok: false, error: "Auflagen-Bild nicht lesbar." },
      { status: 500 },
    );
  }
}

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

    const textRaw = formData.get("text");
    const text =
      typeof textRaw === "string" && textRaw.trim().length >= 8
        ? textRaw.trim()
        : null;

    const { imagePath, imageUrl } = await uploadAuflagenKuerzelImage(
      kuerzel,
      bytes,
      mime,
      auth.user.id,
      text,
    );

    return NextResponse.json({
      ok: true,
      kuerzel,
      imagePath,
      imageUrl,
    });
  } catch (err) {
    console.error("[auflagen-kuerzel/image] unexpected", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Auflagen-Bild konnte nicht gespeichert werden.",
      },
      { status: 500 },
    );
  }
}
