import "server-only";

import { getTagVehicleAccess } from "@/lib/auth/vehicle-access";
import { userHasActiveMembership } from "@/lib/billing/membership-store";
import { isResendConfigured, sendTransactionalEmail } from "@/lib/email/resend";
import { resolvePublicSiteOrigin } from "@/lib/site-origin";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { MOCK_TAG_UUIDS } from "@/lib/tags/mock-tags";
import {
  TAG_SCAN_NOTIFY_THROTTLE_MS,
  TAG_SCAN_RETENTION_DAYS,
  formatTagScanLocation,
  formatTagScanTime,
  isTagScanEmailEnabled,
  shouldNotifyTagScan,
  type TagScanLocation,
} from "@/lib/tags/tag-scan-notify";
import { garagePathForVehicle } from "@/lib/vehicle-surface/paths";

const DEMO_TAG_UUIDS = new Set<string>(Object.values(MOCK_TAG_UUIDS));

export type RecordTagScanResult =
  | { status: "recorded"; notified: boolean }
  | { status: "skipped"; reason: string };

/**
 * Records a guest QR scan and — at most once per throttle window — e-mails the
 * owner. Free owners get a teaser („wurde gescannt“), Pro owners time + city.
 */
export async function recordTagScan(input: {
  tagUuid: string;
  location: TagScanLocation;
}): Promise<RecordTagScanResult> {
  const tagUuid = input.tagUuid.trim();
  if (!tagUuid || DEMO_TAG_UUIDS.has(tagUuid)) {
    return { status: "skipped", reason: "demo" };
  }
  if (!isSupabaseAdminConfigured()) {
    return { status: "skipped", reason: "not-configured" };
  }

  const admin = createAdminClient();
  const { data: tag } = await admin
    .from("tags")
    .select("id, vehicle_id, status")
    .eq("uuid", tagUuid)
    .maybeSingle();
  if (!tag?.vehicle_id || tag.status !== "active") {
    return { status: "skipped", reason: "inactive-tag" };
  }

  const { data: vehicle } = await admin
    .from("vehicles")
    .select("id, user_id, make, model")
    .eq("id", tag.vehicle_id)
    .maybeSingle();
  if (!vehicle?.user_id) {
    return { status: "skipped", reason: "no-owner" };
  }

  // The owner checking their own plaque (or a mechanic with access) is not a „scan“.
  const access = await getTagVehicleAccess(tagUuid, vehicle.user_id, vehicle.id);
  if (access.isOwner || access.isContributor) {
    return { status: "skipped", reason: "insider" };
  }

  const { data: event, error: insertError } = await admin
    .from("tag_scan_events")
    .insert({
      vehicle_id: vehicle.id,
      tag_id: tag.id,
      city: input.location.city,
      region: input.location.region,
      country: input.location.country,
    })
    .select("id, scanned_at")
    .single();
  if (insertError || !event) {
    console.error("[tag-scan] insert failed", insertError?.message);
    return { status: "skipped", reason: "insert-failed" };
  }

  void purgeOldScanEvents(vehicle.id);

  const notified = await maybeNotifyOwner({
    eventId: event.id,
    scannedAt: event.scanned_at,
    ownerUserId: vehicle.user_id,
    vehicleId: vehicle.id,
    vehicleLabel: `${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim() || "Dein Fahrzeug",
    location: input.location,
  });

  return { status: "recorded", notified };
}

async function purgeOldScanEvents(vehicleId: string): Promise<void> {
  try {
    const cutoff = new Date(
      Date.now() - TAG_SCAN_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    await createAdminClient()
      .from("tag_scan_events")
      .delete()
      .eq("vehicle_id", vehicleId)
      .lt("scanned_at", cutoff);
  } catch (error) {
    console.error("[tag-scan] purge failed", error);
  }
}

async function maybeNotifyOwner(input: {
  eventId: string;
  scannedAt: string;
  ownerUserId: string;
  vehicleId: string;
  vehicleLabel: string;
  location: TagScanLocation;
}): Promise<boolean> {
  if (!isResendConfigured()) return false;
  const admin = createAdminClient();

  const { data: lastNotified } = await admin
    .from("tag_scan_events")
    .select("notified_at")
    .eq("vehicle_id", input.vehicleId)
    .not("notified_at", "is", null)
    .order("notified_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!shouldNotifyTagScan(lastNotified?.notified_at ?? null)) return false;

  const { data: owner } = await admin.auth.admin.getUserById(input.ownerUserId);
  const email = owner.user?.email?.trim();
  if (!email || !isTagScanEmailEnabled(owner.user?.user_metadata)) return false;

  // Claim the window before sending so parallel scans at a meet send one mail.
  const windowStart = new Date(
    Date.now() - TAG_SCAN_NOTIFY_THROTTLE_MS,
  ).toISOString();
  const { data: claimed } = await admin
    .from("tag_scan_events")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", input.eventId)
    .is("notified_at", null)
    .select("id")
    .maybeSingle();
  if (!claimed) return false;

  const { count: concurrent } = await admin
    .from("tag_scan_events")
    .select("id", { count: "exact", head: true })
    .eq("vehicle_id", input.vehicleId)
    .gte("notified_at", windowStart)
    .neq("id", input.eventId);
  if ((concurrent ?? 0) > 0) {
    await admin
      .from("tag_scan_events")
      .update({ notified_at: null })
      .eq("id", input.eventId);
    return false;
  }

  const isPro = await userHasActiveMembership(input.ownerUserId);
  const origin = resolvePublicSiteOrigin();
  const dashboardUrl = `${origin}${garagePathForVehicle(input.vehicleId)}`;
  const time = formatTagScanTime(input.scannedAt);
  const where = formatTagScanLocation(input.location);

  const result = isPro
    ? await sendTransactionalEmail({
        to: email,
        kicker: "Live-Scan",
        subject: `Dein ${input.vehicleLabel} wurde gerade gescannt`,
        headline: "Dein Fahrzeug wurde gerade gescannt",
        bodyBlocks: [
          {
            kind: "paragraph",
            text: `Jemand hat um ${time}${where ? ` ${where}` : ""} den QR-Code deines „${input.vehicleLabel}“ gescannt und schaut sich gerade deinen Build an.`,
          },
          {
            kind: "paragraph",
            text: "Alle Scans mit Uhrzeit und Ort findest du im Dashboard.",
          },
        ],
        ctaLabel: "Scans ansehen",
        ctaUrl: dashboardUrl,
        footerNote:
          "Bei vielen Scans hintereinander (z. B. auf einem Treffen) schicken wir höchstens eine Mail pro 30 Minuten. Abschalten: Einstellungen → Benachrichtigungen.",
      })
    : await sendTransactionalEmail({
        to: email,
        kicker: "Live-Scan",
        subject: `Dein ${input.vehicleLabel} wurde gerade gescannt`,
        headline: "Dein Fahrzeug wurde gerade gescannt",
        bodyBlocks: [
          {
            kind: "paragraph",
            text: `Gerade eben hat jemand den QR-Code deines „${input.vehicleLabel}“ gescannt.`,
          },
          {
            kind: "paragraph",
            text: "Mit Pro siehst du bei jedem Scan Uhrzeit und Ort, dazu die komplette Scan-Historie deines Builds.",
          },
        ],
        ctaLabel: "Wann und wo? Mit Pro ansehen",
        ctaUrl: `${origin}${garagePathForVehicle(input.vehicleId, "abo")}`,
        footerNote:
          "Höchstens eine Mail pro 30 Minuten. Abschalten: Einstellungen → Benachrichtigungen.",
      });

  if (!result.ok) {
    console.error("[tag-scan] notify failed", result.message);
  }
  return result.ok;
}
