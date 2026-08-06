import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

const SAFE_FILENAME = /^[a-z0-9-]+\.png$/i;

/**
 * GET /api/vehicle/catalog/[filename]
 * COEP-safe catalog cutouts with explicit CORP/CORS for dashboard <img>.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ filename: string }> },
) {
  const { filename } = await context.params;
  if (!SAFE_FILENAME.test(filename)) {
    return NextResponse.json({ ok: false, error: "Invalid filename." }, {
      status: 400,
    });
  }

  const filePath = path.join(process.cwd(), "public", "vehicles", filename);
  try {
    const bytes = await readFile(filePath);
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "Cross-Origin-Resource-Policy": "cross-origin",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }
}
