import "server-only";

import { isResendConfigured, sendTransactionalEmail } from "@/lib/email/resend";
import {
  weeklyTopBuildReminderWeekKey,
  type WeeklyLeaderEntry,
  becameWeeklyTopBuildLeader,
} from "@/lib/showcase/weekly-leaderboard-logic";
import { loadWeeklyLeaderboardAdmin } from "@/lib/showcase/weekly-leaderboard-admin";
import { resolvePublicSiteOrigin } from "@/lib/site-origin";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

const REMINDER_KEY_PREFIX = "weekly_top_build:";

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

async function hasSentWeeklyTopEmail(
  ownerUserId: string,
  vehicleId: string,
  weekKey: string,
): Promise<boolean> {
  const admin = createAdminClient();
  const reminderKey = `${REMINDER_KEY_PREFIX}${vehicleId}:${weekKey}`;
  const { data } = await admin
    .from("user_email_reminders")
    .select("sent_at")
    .eq("user_id", ownerUserId)
    .eq("reminder_key", reminderKey)
    .maybeSingle();
  return Boolean(data?.sent_at);
}

async function markWeeklyTopEmailSent(
  ownerUserId: string,
  vehicleId: string,
  weekKey: string,
): Promise<void> {
  const admin = createAdminClient();
  const reminderKey = `${REMINDER_KEY_PREFIX}${vehicleId}:${weekKey}`;
  await admin.from("user_email_reminders").upsert(
    {
      user_id: ownerUserId,
      reminder_key: reminderKey,
      sent_at: new Date().toISOString(),
    },
    { onConflict: "user_id,reminder_key" },
  );
}

export async function notifyWeeklyTopBuildRankOneIfNew(options: {
  ownerUserId: string;
  vehicleId: string;
  vehicleLabel: string;
  topBefore: readonly WeeklyLeaderEntry[];
}): Promise<void> {
  if (!isResendConfigured() || !isSupabaseAdminConfigured()) return;

  const topAfter = await loadWeeklyLeaderboardAdmin(2);
  if (
    !becameWeeklyTopBuildLeader(options.vehicleId, options.topBefore, topAfter)
  ) {
    return;
  }

  const weekKey = weeklyTopBuildReminderWeekKey();
  const alreadySent = await hasSentWeeklyTopEmail(
    options.ownerUserId,
    options.vehicleId,
    weekKey,
  );
  if (alreadySent) return;

  const email = await resolveOwnerEmail(options.ownerUserId);
  if (!email) return;

  const leaderLikes = topAfter[0]?.weeklyLikes ?? 0;
  const tagUuid = await resolveTagUuidForVehicle(options.vehicleId);
  const origin = resolvePublicSiteOrigin();
  const entdeckenHref = tagUuid
    ? `${origin}/v/${tagUuid}/entdecken`
    : `${origin}/garage/${options.vehicleId}/entdecken`;

  await sendTransactionalEmail({
    to: email,
    subject: `Platz 1 diese Woche — ${options.vehicleLabel}`,
    headline: "Dein Build führt die Woche",
    bodyBlocks: [
      {
        kind: "paragraph",
        text: `Dein Build „${options.vehicleLabel}" steht gerade auf Platz 1 der Build-Swipe-Woche mit ${leaderLikes} Like${leaderLikes === 1 ? "" : "s"} in den letzten 7 Tagen.`,
      },
      {
        kind: "paragraph",
        text: "Schau dir die Rangliste an und teile deinen Showcase — so bleibst du sichtbar.",
      },
    ],
    ctaLabel: "Zur Wochenrangliste",
    ctaUrl: entdeckenHref,
  });

  await markWeeklyTopEmailSent(
    options.ownerUserId,
    options.vehicleId,
    weekKey,
  );
}
