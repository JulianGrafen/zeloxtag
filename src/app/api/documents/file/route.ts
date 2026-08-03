import { NextResponse, type NextRequest } from "next/server";

import { DOCUMENT_BUCKET } from "@/lib/documents/constants";
import { getSupabaseEnv } from "@/lib/supabase/env";

export const runtime = "nodejs";

/**
 * Proxy document bytes with Content-Disposition: inline so browsers preview
 * instead of downloading (Supabase public URLs often force attachment).
 *
 * Allowed sources:
 * - Same-origin /demo/* assets
 * - Public Supabase Storage objects in `vehicle-documents`
 */
export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get("src")?.trim() ?? "";
  if (!src) {
    return NextResponse.json({ error: "src is required" }, { status: 400 });
  }

  try {
    if (src.startsWith("/demo/")) {
      const origin = request.nextUrl.origin;
      return proxyInline(`${origin}${src}`, guessContentType(src));
    }

    const { url: supabaseUrl } = getSupabaseEnv();
    const parsed = new URL(src);
    const supabaseHost = supabaseUrl ? new URL(supabaseUrl).host : "";
    const isSupabasePublic =
      Boolean(supabaseHost) &&
      parsed.host === supabaseHost &&
      parsed.pathname.includes(`/object/public/${DOCUMENT_BUCKET}/`);

    if (!isSupabasePublic) {
      return NextResponse.json({ error: "Source not allowed" }, { status: 403 });
    }

    return proxyInline(src, guessContentType(src));
  } catch {
    return NextResponse.json({ error: "Invalid src" }, { status: 400 });
  }
}

async function proxyInline(
  remoteUrl: string,
  fallbackType: string,
): Promise<NextResponse> {
  const upstream = await fetch(remoteUrl, { cache: "force-cache" });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: `Upstream ${upstream.status}` },
      { status: upstream.status === 404 ? 404 : 502 },
    );
  }

  const contentType =
    upstream.headers.get("content-type")?.split(";")[0]?.trim() || fallbackType;
  const filename = filenameFromUrl(remoteUrl);

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function filenameFromUrl(url: string): string {
  try {
    const path = new URL(url, "http://local").pathname;
    const base = path.split("/").pop() || "document.pdf";
    return base.replace(/[^\w.\-]+/g, "_").slice(0, 120);
  } catch {
    return "document.pdf";
  }
}

function guessContentType(url: string): string {
  const lower = url.toLowerCase().split("?")[0] ?? "";
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}
