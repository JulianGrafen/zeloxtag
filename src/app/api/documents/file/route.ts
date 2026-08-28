import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/get-user";
import { DOCUMENT_BUCKET } from "@/lib/documents/constants";
import { enforceRateLimit } from "@/lib/security/api-guard";
import { storagePathFromPublicOrAuthenticatedUrl } from "@/lib/security/file-upload";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const querySchema = z
  .object({
    src: z.string().trim().min(1).max(2048),
  })
  .strict();

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Proxy document bytes with Content-Disposition: inline.
 *
 * Authorization (fail closed):
 * - Vehicle owner: any document under the vehicle folder.
 * - Active Schrauber: invoice documents only.
 * Guests / foreign accounts never receive PDF bytes via QR UUID.
 */
export async function GET(request: NextRequest) {
  const limited = await enforceRateLimit(request, "apiDefault", "documents-file");
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
      if (!isSafeDemoDocumentPath(src)) {
        return NextResponse.json({ error: "Source not allowed" }, { status: 403 });
      }
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

    const vehicleId = storagePath.split("/")[0] ?? "";
    if (!UUID_RE.test(vehicleId)) {
      return NextResponse.json({ error: "Source not allowed" }, { status: 403 });
    }

    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
    }

    // AuthZ via user session + RLS; Storage download may still need service
    // role for Schrauber (bucket policies are owner-only).
    const allowed = await authorizeDocumentRead(vehicleId, storagePath);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
      data.type?.split(";")[0]?.trim() || guessContentType(storagePath);
    const filename = filenameFromPath(storagePath);

    return new NextResponse(buffer, {
      status: 200,
      headers: inlineDocumentHeaders(contentType, filename),
    });
  } catch {
    return NextResponse.json({ error: "Invalid src" }, { status: 400 });
  }
}

function documentIdFromStoragePath(storagePath: string): string | null {
  const slash = storagePath.indexOf("/");
  if (slash < 0) return null;
  const rest = storagePath.slice(slash + 1);
  // `{documentId}-{safeName}` — UUID is exactly 36 chars before the next `-`.
  const candidate = rest.slice(0, 36);
  if (!UUID_RE.test(candidate) || rest.charAt(36) !== "-") return null;
  return candidate;
}

async function authorizeDocumentRead(
  vehicleId: string,
  storagePath: string,
): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const readGrant = async () => {
    if (isSupabaseAdminConfigured()) {
      const admin = createAdminClient();
      return admin
        .from("vehicle_contributors")
        .select("id, can_read_history")
        .eq("vehicle_id", vehicleId)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
    }
    const supabase = await createClient();
    return supabase
      .from("vehicle_contributors")
      .select("id, can_read_history")
      .eq("vehicle_id", vehicleId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
  };

  const supabase = await createClient();
  const { data: ownedVehicle } = await supabase
    .from("vehicles")
    .select("id, user_id")
    .eq("id", vehicleId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (ownedVehicle?.user_id === user.id) {
    return true;
  }

  const { data: grant } = await readGrant();
  if (!grant) return false;

  const documentId = documentIdFromStoragePath(storagePath);
  if (!documentId) return false;

  const docClient = isSupabaseAdminConfigured()
    ? createAdminClient()
    : await createClient();

  // Contributor SELECT policy is invoice-only (+ history toggle via RLS).
  let query = docClient
    .from("documents")
    .select("id")
    .eq("id", documentId)
    .eq("vehicle_id", vehicleId)
    .eq("type", "invoice");

  const canReadHistory =
    typeof grant.can_read_history === "boolean"
      ? grant.can_read_history
      : true;
  if (!canReadHistory) {
    query = query.eq("created_by", user.id);
  }

  const { data: document } = await query.maybeSingle();

  return Boolean(document);
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
  const filename = filenameFromPath(remoteUrl);

  return new NextResponse(upstream.body, {
    status: 200,
    headers: inlineDocumentHeaders(contentType, filename),
  });
}

/**
 * Framing allowed for same-origin DocumentViewer.
 * Avoid `default-src 'none'` — it blanks Chrome’s PDF iframe viewer.
 */
function inlineDocumentHeaders(
  contentType: string,
  filename: string,
): Record<string, string> {
  return {
    "Content-Type": contentType,
    "Content-Disposition": `inline; filename="${filename}"`,
    "Cache-Control": "private, max-age=300",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Content-Security-Policy": "frame-ancestors 'self'",
  };
}

/** Same-origin demo assets only — no path traversal or open redirects. */
function isSafeDemoDocumentPath(src: string): boolean {
  return /^\/demo\/[A-Za-z0-9._-]+$/.test(src);
}

function filenameFromPath(url: string): string {
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
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}
