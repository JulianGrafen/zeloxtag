import "server-only";

import { isResendConfigured, sendTransactionalEmail } from "@/lib/email/resend";
import {
  weeklyRankAwardEmailReminderKey,
  weeklyRankAwardEmailSubject,
  weeklyRankAwardHeadline,
} from "@/lib/showcase/weekly-rank-award-keys";
import type { TopThreeWeeklyRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-helpers";
import { resolvePublicSiteOrigin } from "@/lib/site-origin";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

async function resolveOwnerEmail(userId: string): Promise<string | null> {
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

async function reserveEmailSend(
  userId: string,
  reminderKey: string,
): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.from("user_email_reminders").insert({
    user_id: userId,
    reminder_key: reminderKey,
    sent_at: new Date().toISOString(),
  });
  if (error) {
    if (error.code === "23505") return false;
    console.error("[weekly-rank-award-email] reserve failed", error.message);
    return false;
  }
  return true;
}

export async function sendWeeklyRankAwardEmail(options: {
  ownerUserId: string;
  vehicleId: string;
  vehicleLabel: string;
  weekKey: string;
  rank: TopThreeWeeklyRank;
  weeklyLikes: number;
}): Promise<boolean> {
  if (!isResendConfigured() || !isSupabaseAdminConfigured()) return false;

  const reminderKey = weeklyRankAwardEmailReminderKey(
    options.weekKey,
    options.vehicleId,
    options.rank,
  );
  const reserved = await reserveEmailSend(options.ownerUserId, reminderKey);
  if (!reserved) return false;

  const email = await resolveOwnerEmail(options.ownerUserId);
  if (!email) return false;

  const tagUuid = await resolveTagUuidForVehicle(options.vehicleId);
  const origin = resolvePublicSiteOrigin();
  const entdeckenHref = tagUuid
    ? `${origin}/v/${tagUuid}/entdecken?weeklyAward=1`
    : `${origin}/garage/${options.vehicleId}/entdecken?weeklyAward=1`;

  const headline = weeklyRankAwardHeadline(options.rank);
  const likeWord = options.weeklyLikes === 1 ? "Like" : "Likes";

  await sendTransactionalEmail({
    to: email,
    subject: weeklyRankAwardEmailSubject(options.rank, options.vehicleLabel),
    headline,
    bodyBlocks: [
      {
        kind: "paragraph",
        text: `Dein Build „${options.vehicleLabel}" hat Platz ${options.rank} in der Build-Swipe-Woche (${options.weekKey}) mit ${options.weeklyLikes} ${likeWord} erreicht.`,
      },
      {
        kind: "paragraph",
        text: "In der App findest du deine Story-Karte zum Teilen — große Platzierung, Premium-Look, ready für Instagram.",
      },
    ],
    ctaLabel: "Story-Karte öffnen",
    ctaUrl: entdeckenHref,
  });

  return true;
}
