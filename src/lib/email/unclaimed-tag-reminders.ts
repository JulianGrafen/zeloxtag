import "server-only";

import {
  isResendConfigured,
  sendTransactionalEmail,
} from "@/lib/email/resend";
import { wholeDaysSince } from "@/lib/email/pro-trial-reminders";
import { resolvePublicSiteOrigin } from "@/lib/site-origin";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export const UNCLAIMED_TAG_REMINDER_KEYS = {
  day3: "unclaimed_tag_day_3",
  day7: "unclaimed_tag_day_7",
} as const;

export type UnclaimedTagReminderKey =
  (typeof UNCLAIMED_TAG_REMINDER_KEYS)[keyof typeof UNCLAIMED_TAG_REMINDER_KEYS];

export function isDueUnclaimedTagReminderDay(
  daysSinceSignup: number,
  targetDay: 3 | 7,
): boolean {
  return daysSinceSignup >= targetDay && daysSinceSignup < targetDay + 1;
}

function siteOrigin(): string {
  return resolvePublicSiteOrigin();
}

async function reserveReminderSend(
  userId: string,
  reminderKey: UnclaimedTagReminderKey,
): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.from("user_email_reminders").insert({
    user_id: userId,
    reminder_key: reminderKey,
  });
  if (error) {
    if (error.code === "23505") return false;
    console.error("[unclaimed-tag-reminders] reserve failed", error.message);
    return false;
  }
  return true;
}

async function releaseReminderSend(
  userId: string,
  reminderKey: UnclaimedTagReminderKey,
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("user_email_reminders")
    .delete()
    .eq("user_id", userId)
    .eq("reminder_key", reminderKey);
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

export async function loadUserIdsWithActiveTag(): Promise<Set<string>> {
  const admin = createAdminClient();
  const { data: tagRows, error: tagError } = await admin
    .from("tags")
    .select("vehicle_id")
    .eq("status", "active")
    .not("vehicle_id", "is", null);

  if (tagError) {
    console.error(
      "[unclaimed-tag-reminders] active tag lookup failed",
      tagError.message,
    );
    return new Set();
  }

  const vehicleIds = [
    ...new Set(
      (tagRows ?? [])
        .map((row) => row.vehicle_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];
  if (vehicleIds.length === 0) return new Set();

  const { data: vehicles, error: vehicleError } = await admin
    .from("vehicles")
    .select("user_id")
    .in("id", vehicleIds);

  if (vehicleError) {
    console.error(
      "[unclaimed-tag-reminders] vehicle lookup failed",
      vehicleError.message,
    );
    return new Set();
  }

  return new Set(
    (vehicles ?? [])
      .map((row) => row.user_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  );
}

async function sendUnclaimedTagDay3Email(input: {
  userId: string;
  to: string;
}): Promise<boolean> {
  const activateUrl = `${siteOrigin()}/dashboard`;
  const headline = await greetingForUser(input.userId);

  const result = await sendTransactionalEmail({
    to: input.to,
    subject: "Dein ZeloxTag wartet — 2 Minuten bis zum digitalen Zwilling",
    kicker: "Tag aktivieren",
    headline,
    bodyBlocks: [
      {
        kind: "paragraph",
        text:
          "dein Konto bei ZeloxTag ist da — der Edelstahl-QR am Fahrzeug ist aber noch nicht mit einem Fahrzeug verknüpft. Ohne Aktivierung kann niemand deine Akte per Scan öffnen.",
      },
      { kind: "heading", text: "So geht’s in zwei Minuten:" },
      {
        kind: "list",
        items: [
          "QR-Code am Tag im Motorraum mit dem Handy scannen.",
          "Anmelden (oder Konto anlegen) und Marke, Modell und Baujahr eintragen.",
          "Fertig — dein Build ist live und bereit für Belege, ABEs und TÜV.",
        ],
      },
      {
        kind: "paragraph",
        text:
          "Der Tag bleibt unverändert am Auto — du verknüpfst nur die digitale Historie.",
      },
    ],
    ctaLabel: "Zum Dashboard & Scan starten",
    ctaUrl: activateUrl,
    afterCtaLine:
      "Liegt der Tag noch in der Verpackung? Einfach montieren und dann scannen.",
    signOffLines: ["Beste Grüße", "Julian von ZeloxTag"],
  });

  return result.ok;
}

async function sendUnclaimedTagDay7Email(input: {
  userId: string;
  to: string;
}): Promise<boolean> {
  const activateUrl = `${siteOrigin()}/dashboard`;
  const headline = await greetingForUser(input.userId);

  const result = await sendTransactionalEmail({
    to: input.to,
    subject: "Kurzer Reminder: ZeloxTag noch nicht aktiviert?",
    kicker: "Noch offen",
    headline,
    bodyBlocks: [
      {
        kind: "paragraph",
        text:
          "kurze Erinnerung: Dein ZeloxTag ist bei uns registriert, aber noch nicht mit einem Fahrzeug verbunden.",
      },
      {
        kind: "paragraph",
        text:
          "Sobald der Tag aktiv ist, hast du eine lückenlose digitale Akte am Motorraum — Rechnungen, Gutachten und TÜV an einem Ort, scanbar für Käufer und Werkstatt.",
      },
      { kind: "heading", text: "Wenn etwas hakt:" },
      {
        kind: "list",
        items: [
          "Tag nicht montiert? Erst befestigen, dann QR scannen.",
          "Anderes Handy oder Browser? Einfach erneut scannen — dein Konto bleibt bestehen.",
          "Fragen zur Montage? Antworte auf diese Mail, wir helfen dir weiter.",
        ],
      },
    ],
    ctaLabel: "Jetzt Tag aktivieren",
    ctaUrl: activateUrl,
    signOffLines: ["Beste Grüße", "Julian von ZeloxTag"],
  });

  return result.ok;
}

type AuthUserRow = {
  id: string;
  email?: string | null;
  created_at?: string;
  email_confirmed_at?: string | null;
};

export async function processDueUnclaimedTagReminderEmails(
  limit = 40,
): Promise<{ day3: number; day7: number; skipped: number }> {
  if (!isSupabaseAdminConfigured() || !isResendConfigured()) {
    return { day3: 0, day7: 0, skipped: 0 };
  }

  const admin = createAdminClient();
  const activeTagUserIds = await loadUserIdsWithActiveTag();

  let day3 = 0;
  let day7 = 0;
  let skipped = 0;
  let sent = 0;
  let page = 1;
  const perPage = 100;

  while (sent < limit) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      console.error("[unclaimed-tag-reminders] listUsers failed", error.message);
      break;
    }

    const users = (data.users ?? []) as AuthUserRow[];
    if (users.length === 0) break;

    for (const user of users) {
      if (sent >= limit) break;

      const userId = user.id;
      if (!userId || activeTagUserIds.has(userId)) {
        skipped += 1;
        continue;
      }

      if (!user.email_confirmed_at) {
        skipped += 1;
        continue;
      }

      const to = user.email?.trim().toLowerCase();
      if (!to?.includes("@")) {
        skipped += 1;
        continue;
      }

      const createdAt = user.created_at;
      if (!createdAt) {
        skipped += 1;
        continue;
      }

      const days = wholeDaysSince(createdAt);
      if (days < 0) {
        skipped += 1;
        continue;
      }

      if (isDueUnclaimedTagReminderDay(days, 3)) {
        const reserved = await reserveReminderSend(
          userId,
          UNCLAIMED_TAG_REMINDER_KEYS.day3,
        );
        if (!reserved) {
          skipped += 1;
          continue;
        }
        const ok = await sendUnclaimedTagDay3Email({ userId, to });
        if (ok) {
          day3 += 1;
          sent += 1;
        } else {
          await releaseReminderSend(userId, UNCLAIMED_TAG_REMINDER_KEYS.day3);
        }
        continue;
      }

      if (isDueUnclaimedTagReminderDay(days, 7)) {
        const reserved = await reserveReminderSend(
          userId,
          UNCLAIMED_TAG_REMINDER_KEYS.day7,
        );
        if (!reserved) {
          skipped += 1;
          continue;
        }
        const ok = await sendUnclaimedTagDay7Email({ userId, to });
        if (ok) {
          day7 += 1;
          sent += 1;
        } else {
          await releaseReminderSend(userId, UNCLAIMED_TAG_REMINDER_KEYS.day7);
        }
        continue;
      }

      skipped += 1;
    }

    if (users.length < perPage) break;
    page += 1;
  }

  return { day3, day7, skipped };
}
