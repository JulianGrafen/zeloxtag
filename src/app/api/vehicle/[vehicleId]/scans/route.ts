import { NextResponse, type NextRequest } from "next/server";

import { userHasActiveMembership } from "@/lib/billing/membership-store";
import { requireApiUser } from "@/lib/security/api-guard";
import { RATE_LIMITS, rateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import type { VehicleScanSummary } from "@/lib/tags/tag-scan-notify";

export const runtime = "nodejs";

const RECENT_LIMIT = 5;

function startOfBerlinDayIso(nowMs = Date.now()): string {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(nowMs));
  // „GMT+1“ (winter) / „GMT+2“ (summer) → ISO offset for Berlin midnight.
  const offsetLabel =
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Berlin",
      timeZoneName: "shortOffset",
    })
      .formatToParts(new Date(nowMs))
      .find((part) => part.type === "timeZoneName")?.value ?? "GMT+1";
  const hours = Number.parseInt(offsetLabel.replace("GMT", "") || "0", 10);
  const sign = hours < 0 ? "-" : "+";
  const offset = `${sign}${String(Math.abs(hours)).padStart(2, "0")}:00`;
  return new Date(`${day}T00:00:00${offset}`).toISOString();
}

/** GET /api/vehicle/{vehicleId}/scans — owner-only via RLS on tag_scan_events. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> },
) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;

  const limited = await rateLimit({
    key: `vehicle-scans:${auth.user.id}`,
    limit: RATE_LIMITS.tagScan.limit,
    windowMs: RATE_LIMITS.tagScan.windowMs,
  });
  if (!limited.ok) {
    return NextResponse.json({ error: "Zu viele Anfragen." }, { status: 429 });
  }

  const { vehicleId } = await params;
  const supabase = await createClient();

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("id")
    .eq("id", vehicleId)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!vehicle) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const count = (sinceIso?: string) => {
    let query = supabase
      .from("tag_scan_events")
      .select("id", { count: "exact", head: true })
      .eq("vehicle_id", vehicleId);
    if (sinceIso) query = query.gte("scanned_at", sinceIso);
    return query;
  };

  const [isPro, today, week, total, recentResult] = await Promise.all([
    userHasActiveMembership(auth.user.id),
    count(startOfBerlinDayIso()),
    count(sevenDaysAgo),
    count(),
    supabase
      .from("tag_scan_events")
      .select("scanned_at, city, country")
      .eq("vehicle_id", vehicleId)
      .order("scanned_at", { ascending: false })
      .limit(RECENT_LIMIT),
  ]);

  const recentRows = recentResult.data ?? [];
  const summary: VehicleScanSummary = {
    isPro,
    todayCount: today.count ?? 0,
    last7DaysCount: week.count ?? 0,
    totalCount: total.count ?? 0,
    recent: isPro
      ? recentRows.map((row) => ({
          scannedAt: row.scanned_at,
          city: row.city,
          country: row.country,
        }))
      : [],
  };

  return NextResponse.json(summary, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
