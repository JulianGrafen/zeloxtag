import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { DOCUMENT_BUCKET } from "@/lib/documents/constants";
import { enforceRateLimit } from "@/lib/security/api-guard";
import { storagePathFromPublicOrAuthenticatedUrl } from "@/lib/security/file-upload";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";

export const runtime = "nodejs";

const querySchema = z
  .object({
    src: z.string().trim().min(1).max(2048),
  })
  .strict();

/**
 * Proxy document bytes with Content-Disposition: inline.
 *
 * Zero-Trust: vehicle-documents bucket is private. Bytes are loaded via
 * service-role after SSRF-hardening the `src` to our Supabase host + bucket.
 * Public GET is allowlisted so QR digital-twin viewers can open originals.
 */
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, "apiDefault", "documents-file");
  if (limited) return limited;

  const parsed = querySchema.safeParse({
    src: request.nextUrl.searchParams.get("src")?.trim() ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "src is required" }, { status: 400 });
  }
  const src = parsed.data.src;

  try {
    if (src.startsWith("/demo/")) {
      const origin = request.nextUrl.origin;
      return proxyInline(`${origin}${src}`, guessContentType(src));
    }

    const { url: supabaseUrl } = getSupabaseEnv();
    if (!supabaseUrl) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
    }

    const parsedUrl = new URL(src);
    const supabaseHost = new URL(supabaseUrl).host;
    if (parsedUrl.host !== supabaseHost) {
      return NextResponse.json({ error: "Source not allowed" }, { status: 403 });
    }

    const storagePath = storagePathFromPublicOrAuthenticatedUrl(
      src,
      DOCUMENT_BUCKET,
    );
    if (!storagePath) {
      return NextResponse.json({ error: "Source not allowed" }, { status: 403 });
    }

    // Private bucket → service-role download (never expose the key to the client).
    if (isSupabaseAdminConfigured()) {
      const admin = createAdminClient();
      const { data, error } = await admin.storage
        .from(DOCUMENT_BUCKET)
        .download(storagePath);

      if (error || !data) {
        return NextResponse.json(
          { error: error?.message ?? "Not found" },
          { status: 404 },
        );
      }

      const buffer = Buffer.from(await data.arrayBuffer());
      const contentType =
        data.type?.split(";")[0]?.trim() || guessContentType(storagePath);
      const filename = filenameFromUrl(storagePath);

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `inline; filename="${filename}"`,
          "Cache-Control": "private, max-age=300",
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "SAMEORIGIN",
          "Content-Security-Policy": "default-src 'none'; frame-ancestors 'self'",
        },
      });
    }

    // Local/dev fallback when admin key is missing — public URL only.
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
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'self'",
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
