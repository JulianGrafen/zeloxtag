import "server-only";

import { isResendConfigured, sendTransactionalEmail } from "@/lib/email/resend";
import { resolvePublicSiteOrigin } from "@/lib/site-origin";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

const REMINDER_KEY_PREFIX = "showcase_like:";

async function resolveOwnerEmail(userId: string): Promise<string | null> {
  if (!isSupabaseAdminConfigured()) return null;
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user?.email) return null;
  return data.user.email.trim() || null;
}

async function resolveTagUuidForVehicle(vehicleId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tags")
    .select("uuid")
    .eq("vehicle_id", vehicleId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.uuid ?? null;
}

async function shouldSendLikeEmail(
  ownerUserId: string,
  vehicleId: string,
): Promise<boolean> {
  const admin = createAdminClient();
  const reminderKey = `${REMINDER_KEY_PREFIX}${vehicleId}`;
  const { data } = await admin
    .from("user_email_reminders")
    .select("sent_at")
    .eq("user_id", ownerUserId)
    .eq("reminder_key", reminderKey)
    .maybeSingle();

  if (!data?.sent_at) return true;

  const sentAt = Date.parse(data.sent_at);
  if (!Number.isFinite(sentAt)) return true;
  const hoursSince = (Date.now() - sentAt) / (1000 * 60 * 60);
  return hoursSince >= 24;
}

async function markLikeEmailSent(ownerUserId: string, vehicleId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("user_email_reminders").upsert(
    {
      user_id: ownerUserId,
      reminder_key: `${REMINDER_KEY_PREFIX}${vehicleId}`,
      sent_at: new Date().toISOString(),
    },
    { onConflict: "user_id,reminder_key" },
  );
}

export async function notifyShowcaseLikeReceived(options: {
  ownerUserId: string;
  vehicleId: string;
  vehicleLabel: string;
}): Promise<void> {
  if (!isResendConfigured() || !isSupabaseAdminConfigured()) return;

  const shouldSend = await shouldSendLikeEmail(
    options.ownerUserId,
    options.vehicleId,
  );
  if (!shouldSend) return;

  const email = await resolveOwnerEmail(options.ownerUserId);
  if (!email) return;

  const tagUuid = await resolveTagUuidForVehicle(options.vehicleId);
  const origin = resolvePublicSiteOrigin();
  const dashboardHref = tagUuid ? `${origin}/v/${tagUuid}` : origin;

  await sendTransactionalEmail({
    to: email,
    subject: `Neuer Like für deinen Build — ${options.vehicleLabel}`,
    headline: "Neuer Build-Swipe Like",
    bodyBlocks: [
      {
        kind: "paragraph",
        text: `Dein Build „${options.vehicleLabel}" hat einen neuen Like im Build-Swipe erhalten.`,
      },
      {
        kind: "paragraph",
        text: "Öffne dein Dashboard, um die Übersicht zu sehen.",
      },
    ],
    ctaLabel: "Zum Dashboard",
    ctaUrl: dashboardHref,
  });

  await markLikeEmailSent(options.ownerUserId, options.vehicleId);
}
