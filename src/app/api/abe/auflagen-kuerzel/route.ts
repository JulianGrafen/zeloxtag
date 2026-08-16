import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  parseAuflagenKuerzelRecords,
} from "@/lib/ocr/auflagen-kuerzel-db";
import {
  appendAuflagenKuerzelRecords,
  loadAuflagenKuerzelDb,
  loadAuflagenKuerzelRecordsWithImages,
} from "@/lib/ocr/auflagen-kuerzel-store";
import {
  enforceRateLimit,
  enforceSameOrigin,
  requireApiUser,
} from "@/lib/security/api-guard";

export const runtime = "nodejs";

const learnBodySchema = z
  .object({
    records: z.array(
      z.object({
        kuerzel: z.string().trim().min(1).max(6),
        text: z.string().trim().min(8).max(8000),
      }),
    ),
  })
  .strict();

type Success = {
  ok: true;
  records: { kuerzel: string; text: string; imageUrl?: string | null }[];
  added?: number;
  total?: number;
};

type ErrorBody = {
  ok: false;
  error: string;
};

function jsonError(status: number, error: string) {
  const body: ErrorBody = { ok: false, error };
  return NextResponse.json(body, { status });
}

/** GET /api/abe/auflagen-kuerzel — merged Kürzel lookup table. */
export async function GET(): Promise<NextResponse> {
  try {
    const auth = await requireApiUser();
    if (!auth.ok) return auth.response;

    const records = await loadAuflagenKuerzelRecordsWithImages();
    const body: Success = {
      ok: true,
      records,
    };
    return NextResponse.json(body);
  } catch (err) {
    console.error("[auflagen-kuerzel] read failed", err);
    return jsonError(500, "Kürzel-Datenbank nicht lesbar.");
  }
}

/** POST /api/abe/auflagen-kuerzel — learn new OCR entries into Supabase. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const limited = await enforceRateLimit(request, "apiDefault", "auflagen-kuerzel");
    if (limited) return limited;

    const auth = await requireApiUser();
    if (!auth.ok) return auth.response;

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return jsonError(400, "Expected JSON body.");
    }

    const parsed = learnBodySchema.safeParse(payload);
    if (!parsed.success) {
      return jsonError(400, "Ungültige Kürzel-Daten.");
    }

    const incoming = parseAuflagenKuerzelRecords(parsed.data.records);
    const { added, total } = await appendAuflagenKuerzelRecords(
      incoming,
      auth.user.id,
    );
    const body: Success = {
      ok: true,
      added,
      total,
      records: await loadAuflagenKuerzelRecordsWithImages(),
    };
    return NextResponse.json(body);
  } catch (err) {
    console.error("[auflagen-kuerzel] write failed", err);
    return jsonError(500, "Kürzel konnten nicht gespeichert werden.");
  }
}
