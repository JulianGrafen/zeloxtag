import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  auflagenKuerzelMapToRecords,
  parseAuflagenKuerzelRecords,
} from "@/lib/ocr/auflagen-kuerzel-db";
import {
  appendAuflagenKuerzelRecords,
  loadAuflagenKuerzelDb,
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
  records: { kuerzel: string; text: string }[];
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

    const db = await loadAuflagenKuerzelDb();
    const body: Success = {
      ok: true,
      records: auflagenKuerzelMapToRecords(db),
    };
    return NextResponse.json(body);
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "Kürzel-Datenbank nicht lesbar.",
    );
  }
}

/** POST /api/abe/auflagen-kuerzel — learn new OCR entries into JSON store. */
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
    const { added, total } = await appendAuflagenKuerzelRecords(incoming);
    const db = await loadAuflagenKuerzelDb();

    const body: Success = {
      ok: true,
      added,
      total,
      records: auflagenKuerzelMapToRecords(db),
    };
    return NextResponse.json(body);
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "Kürzel konnten nicht gespeichert werden.",
    );
  }
}
