import "server-only";

import { PRO_PLAN_MONTHLY_PRICE, PRO_TRIAL_DAYS } from "@/lib/billing/pro-plan";
import { isResendConfigured, sendTransactionalEmail } from "@/lib/email/resend";
import { resolvePublicSiteOrigin } from "@/lib/site-origin";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { isActiveMembership } from "@/lib/billing/membership";

export const REMINDER_KEYS = {
  tagActivated: "tag_activated_pro_nudge",
  trialDay7: "pro_trial_day_7",
  trialDay12: "pro_trial_day_12",
} as const;

export type ReminderKey = (typeof REMINDER_KEYS)[keyof typeof REMINDER_KEYS];

const MS_PER_DAY = 86_400_000;

export function wholeDaysSince(isoStart: string, nowMs = Date.now()): number {
  const start = Date.parse(isoStart);
  if (!Number.isFinite(start)) return -1;
  return Math.floor((nowMs - start) / MS_PER_DAY);
}

function siteOrigin(): string {
  return resolvePublicSiteOrigin();
}

async function resolveUserFirstName(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) return null;

  const rawName =
    typeof data.user.user_metadata?.name === "string"
      ? data.user.user_metadata.name.trim()
      : typeof data.user.user_metadata?.full_name === "string"
        ? data.user.user_metadata.full_name.trim()
        : null;
  if (!rawName) return null;

  const first = rawName.split(/\s+/)[0]?.trim();
  return first || null;
}

async function greetingForUser(userId: string): Promise<string> {
  const firstName = await resolveUserFirstName(userId);
  return firstName ? `Hey ${firstName},` : "Hey,";
}

async function findPrimaryTagUuidForUser(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: vehicles, error: vehicleError } = await admin
    .from("vehicles")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(5);

  if (vehicleError) {
    console.error("[pro-trial-reminders] vehicle lookup failed", vehicleError.message);
    return null;
  }

  for (const vehicle of vehicles ?? []) {
    const vehicleId = typeof vehicle.id === "string" ? vehicle.id : null;
    if (!vehicleId) continue;
    const { data: tag, error: tagError } = await admin
      .from("tags")
      .select("uuid")
      .eq("vehicle_id", vehicleId)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (tagError) continue;
    if (typeof tag?.uuid === "string") return tag.uuid;
  }
  return null;
}

async function reserveReminderSend(
  userId: string,
  reminderKey: ReminderKey,
): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.from("user_email_reminders").insert({
    user_id: userId,
    reminder_key: reminderKey,
  });
  if (error) {
    if (error.code === "23505") return false;
    console.error("[pro-trial-reminders] reserve failed", error.message);
    return false;
  }
  return true;
}

async function releaseReminderSend(
  userId: string,
  reminderKey: ReminderKey,
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("user_email_reminders")
    .delete()
    .eq("user_id", userId)
    .eq("reminder_key", reminderKey);
}

export async function sendTagActivatedProNudgeEmail(input: {
  userId: string;
  to: string;
  tagUuid: string;
}): Promise<{ sent: boolean; reason?: string }> {
  if (!isSupabaseAdminConfigured() || !isResendConfigured()) {
    return { sent: false, reason: "not_configured" };
  }

  const reserved = await reserveReminderSend(
    input.userId,
    REMINDER_KEYS.tagActivated,
  );
  if (!reserved) return { sent: false, reason: "already_sent" };

  const proUrl = `${siteOrigin()}/v/${encodeURIComponent(input.tagUuid)}/abo`;
  const headline = await greetingForUser(input.userId);

  const result = await sendTransactionalEmail({
    to: input.to,
    subject: "Dein Build ist online — schalte dir 14 Tage PRO frei",
    headline,
    bodyBlocks: [
      {
        kind: "paragraph",
        text:
          "sauber – dein Tag ist am Fahrzeug verknüpft und dein Build offiziell live.",
      },
      {
        kind: "paragraph",
        text: `In deinem Dashboard wartet dein Startbonus: Du kannst dir ab sofort ${PRO_TRIAL_DAYS} Tage PRO komplett kostenlos freischalten – ohne Zahlungsdaten, ohne Abo-Falle.`,
      },
      { kind: "heading", text: "Warum sich das lohnt:" },
      {
        kind: "paragraph",
        text:
          "Mit PRO fotografierst du Rechnungen, ABEs und Dyno-Sheets einfach ab. Unsere KI zieht Beträge, Werkstattdaten und Teilenummern in zwei Sekunden automatisch in deine Akte.",
      },
    ],
    ctaLabel: "14 Tage PRO in der App aktivieren",
    ctaUrl: proUrl,
    afterCtaLine: "Hol das Maximum aus deinem ersten Scan heraus.",
    signOffLines: ["Beste Grüße", "Julian von ZeloxTag"],
  });

  if (!result.ok) {
    await releaseReminderSend(input.userId, REMINDER_KEYS.tagActivated);
    console.error("[pro-trial-reminders] tag activated mail failed", result.message);
    return { sent: false, reason: "send_failed" };
  }
  return { sent: true };
}

export async function notifyTagActivatedProNudge(input: {
  userId: string;
  email: string;
  tagUuid: string;
}): Promise<void> {
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) return;
  await sendTagActivatedProNudgeEmail({
    userId: input.userId,
    to: email,
    tagUuid: input.tagUuid,
  });
}

async function sendTrialDay7Email(input: {
  userId: string;
  to: string;
  tagUuid: string | null;
}): Promise<boolean> {
  const akteUrl = input.tagUuid
    ? `${siteOrigin()}/v/${encodeURIComponent(input.tagUuid)}/dokumente`
    : `${siteOrigin()}/settings`;

  const headline = await greetingForUser(input.userId);

  const result = await sendTransactionalEmail({
    to: input.to,
    subject: "Halbzeit: Liegt deine Historie noch im Handschuhfach?",
    headline,
    bodyBlocks: [
      {
        kind: "paragraph",
        text: "die erste Woche deines PRO-Tests ist rum.",
      },
      {
        kind: "paragraph",
        text:
          "Der größte Hebel zeigt sich auf Treffen oder an der Tanke: Jemand scannt deinen Tag und sieht sofort deine Specs, deine Umbauten und deine verbauten Marken – ohne dass du Papierkram wälzen musst.",
      },
      { kind: "heading", text: "Dein Test für heute:" },
      {
        kind: "paragraph",
        text:
          "Schnapp dir eine Rechnung von deinem letzten Umbau und lass die KI die Daten strukturieren, oder generiere mit einem Klick dein Treffen-Exposé.",
      },
    ],
    ctaLabel: "Fahrzeugakte öffnen",
    ctaUrl: akteUrl,
    afterCtaLine: "Zeig der Community, was in deinem Build steckt.",
    signOffLines: ["Julian"],
  });
  return result.ok;
}

async function sendTrialDay12Email(input: {
  userId: string;
  to: string;
  tagUuid: string | null;
}): Promise<boolean> {
  const aboUrl = input.tagUuid
    ? `${siteOrigin()}/v/${encodeURIComponent(input.tagUuid)}/abo`
    : `${siteOrigin()}/settings`;

  const headline = await greetingForUser(input.userId);

  const result = await sendTransactionalEmail({
    to: input.to,
    subject: "Noch 48 Stunden PRO: Behältst du den Autopiloten?",
    headline,
    bodyBlocks: [
      {
        kind: "paragraph",
        text: `in zwei Tagen läuft deine ${PRO_TRIAL_DAYS}-tägige PRO-Phase aus.`,
      },
      {
        kind: "paragraph",
        text:
          "Keine Sorge: Dein Tag, deine digitale Visitenkarte und alle bisher manuell eingepflegten Daten bleiben dauerhaft 100 % kostenlos. Dein Auto bleibt für jeden erreichbar.",
      },
      { kind: "heading", text: "Was danach pausiert:" },
      {
        kind: "list",
        items: [
          "Der automatische KI-Belegscan (Belege müssen manuell abgetippt werden)",
          "Der Sammel-Export für Gutachter, Treffen und Käufer",
        ],
      },
      {
        kind: "paragraph",
        text: `Wenn du die Zeitersparnis behalten willst: Für ${PRO_PLAN_MONTHLY_PRICE} im Monat – weniger als eine Dose Bremsenreiniger – bleibt alles lückenlos aktiv.`,
      },
    ],
    ctaLabel: `PRO für ${PRO_PLAN_MONTHLY_PRICE} / Monat sichern`,
    ctaUrl: aboUrl,
    footerNote: "Jederzeit monatlich mit einem Klick kündbar.",
    signOffLines: ["Julian von ZeloxTag"],
  });
  return result.ok;
}

type TrialMembershipRow = {
  user_id: string;
  email: string;
  trial_started_at: string;
  trial_ends_at: string | null;
  status: string;
  current_period_end: string | null;
};

export async function processDueProTrialReminderEmails(
  limit = 40,
): Promise<{ day7: number; day12: number; skipped: number }> {
  if (!isSupabaseAdminConfigured() || !isResendConfigured()) {
    return { day7: 0, day12: 0, skipped: 0 };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("memberships")
    .select(
      "user_id, email, trial_started_at, trial_ends_at, status, current_period_end",
    )
    .eq("billing_provider", "stripe")
    .not("trial_started_at", "is", null)
    .not("user_id", "is", null)
    .limit(limit);

  if (error) {
    console.error("[pro-trial-reminders] membership query failed", error.message);
    return { day7: 0, day12: 0, skipped: 0 };
  }

  let day7 = 0;
  let day12 = 0;
  let skipped = 0;
  const now = Date.now();

  for (const row of data ?? []) {
    const membership = row as TrialMembershipRow;
    const userId = membership.user_id;
    if (!userId || !membership.trial_started_at) {
      skipped += 1;
      continue;
    }

    if (
      !isActiveMembership(
        membership.status as "active" | "pending" | "past_due" | "canceled",
        membership.current_period_end,
      )
    ) {
      skipped += 1;
      continue;
    }

    const trialEndMs = membership.trial_ends_at
      ? Date.parse(membership.trial_ends_at)
      : NaN;
    if (Number.isFinite(trialEndMs) && trialEndMs <= now) {
      skipped += 1;
      continue;
    }

    const days = wholeDaysSince(membership.trial_started_at, now);
    const to = membership.email?.trim().toLowerCase();
    if (!to?.includes("@")) {
      skipped += 1;
      continue;
    }

    const tagUuid = await findPrimaryTagUuidForUser(userId);

    if (days >= 7 && days < 8) {
      const reserved = await reserveReminderSend(userId, REMINDER_KEYS.trialDay7);
      if (!reserved) continue;
      const ok = await sendTrialDay7Email({ userId, to, tagUuid });
      if (ok) day7 += 1;
      else await releaseReminderSend(userId, REMINDER_KEYS.trialDay7);
    } else if (days >= 12 && days < 13) {
      const reserved = await reserveReminderSend(userId, REMINDER_KEYS.trialDay12);
      if (!reserved) continue;
      const ok = await sendTrialDay12Email({ userId, to, tagUuid });
      if (ok) day12 += 1;
      else await releaseReminderSend(userId, REMINDER_KEYS.trialDay12);
    } else {
      skipped += 1;
    }
  }

  return { day7, day12, skipped };
}

export async function syncMembershipTrialWindow(input: {
  userId: string | null;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
}): Promise<void> {
  if (!input.userId || !isSupabaseAdminConfigured()) return;
  if (!input.trialEndsAt) return;

  const trialEndMs = Date.parse(input.trialEndsAt);
  if (!Number.isFinite(trialEndMs) || trialEndMs <= Date.now()) return;

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("memberships")
    .select("trial_started_at")
    .eq("user_id", input.userId)
    .maybeSingle();

  const patch: Record<string, string> = {
    trial_ends_at: input.trialEndsAt,
  };
  if (!existing?.trial_started_at) {
    patch.trial_started_at = input.trialStartedAt ?? new Date().toISOString();
  }

  await admin.from("memberships").update(patch).eq("user_id", input.userId);
}
