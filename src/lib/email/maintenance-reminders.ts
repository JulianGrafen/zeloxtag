import "server-only";

import { isResendConfigured, sendTransactionalEmail } from "@/lib/email/resend";
import { resolvePublicSiteOrigin } from "@/lib/site-origin";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

const MS_PER_DAY = 86_400_000;

export type MaintenanceScheduleKind = "oil_change" | "brake_pads";

const KIND_LABEL: Record<MaintenanceScheduleKind, string> = {
  oil_change: "Ölwechsel",
  brake_pads: "Bremsbeläge",
};

export function maintenanceDueReminderKey(
  kind: MaintenanceScheduleKind,
  vehicleId: string,
): string {
  return `maintenance_due:${kind}:${vehicleId}`;
}

export function maintenanceOverdueReminderKey(
  kind: MaintenanceScheduleKind,
  vehicleId: string,
): string {
  return `maintenance_overdue:${kind}:${vehicleId}`;
}

function siteOrigin(): string {
  return resolvePublicSiteOrigin();
}

function wholeDaysUntil(isoDate: string, nowMs = Date.now()): number {
  const target = Date.parse(`${isoDate}T12:00:00.000Z`);
  if (!Number.isFinite(target)) return 999;
  return Math.floor((target - nowMs) / MS_PER_DAY);
}

function isMaintenanceEmailEnabled(
  userMetadata: Record<string, unknown> | undefined,
): boolean {
  if (userMetadata?.maintenance_email_reminders === false) return false;
  return true;
}

async function reserveReminderSend(
  userId: string,
  reminderKey: string,
): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.from("user_email_reminders").insert({
    user_id: userId,
    reminder_key: reminderKey,
  });
  if (error) {
    if (error.code === "23505") return false;
    console.error("[maintenance-reminders] reserve failed", error.message);
    return false;
  }
  return true;
}

async function releaseReminderSend(
  userId: string,
  reminderKey: string,
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("user_email_reminders")
    .delete()
    .eq("user_id", userId)
    .eq("reminder_key", reminderKey);
}

async function resolveUserEmail(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user?.email) return null;
  return data.user.email;
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

type ScheduleRow = {
  vehicle_id: string;
  kind: MaintenanceScheduleKind;
  next_due_km: number;
  next_due_date: string;
  part_number: string | null;
};

type VehicleRow = {
  id: string;
  user_id: string;
  make: string;
  model: string;
};

async function tagUuidForVehicle(vehicleId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tags")
    .select("uuid")
    .eq("vehicle_id", vehicleId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return typeof data?.uuid === "string" ? data.uuid : null;
}

async function sendMaintenanceEmail(input: {
  email: string;
  greeting: string;
  vehicleLabel: string;
  kind: MaintenanceScheduleKind;
  nextDueDate: string;
  nextDueKm: number;
  partNumber: string | null;
  tagUuid: string;
  overdue: boolean;
}): Promise<boolean> {
  const serviceLabel = KIND_LABEL[input.kind];
  const intervalsUrl = `${siteOrigin()}/v/${input.tagUuid}/intervalle`;
  const subject = input.overdue
    ? `Überfällig: ${serviceLabel} · ${input.vehicleLabel}`
    : `Bald fällig: ${serviceLabel} · ${input.vehicleLabel}`;

  const bodyBlocks = [
    {
      kind: "paragraph" as const,
      text: `${input.greeting} für dein ${input.vehicleLabel} steht ${
        input.overdue ? "seit dem Fälligkeitsdatum ein" : "in Kürze ein"
      } ${serviceLabel} an.`,
    },
    {
      kind: "paragraph" as const,
      text: `Ziel: ${input.nextDueKm.toLocaleString("de-DE")} km · spätestens ${input.nextDueDate}.`,
    },
  ];
  if (input.partNumber) {
    bodyBlocks.push({
      kind: "paragraph" as const,
      text: `Teilenummer aus Beleg: ${input.partNumber}`,
    });
  }

  const sent = await sendTransactionalEmail({
    to: input.email,
    subject,
    headline: input.overdue ? "Wartung überfällig" : "Wartung bald fällig",
    bodyBlocks,
    ctaLabel: "Intervalle öffnen",
    ctaUrl: intervalsUrl,
  });
  return sent.ok;
}

export async function processDueMaintenanceReminderEmails(
  limit = 80,
): Promise<{ scanned: number; sent: number; skipped: number }> {
  if (!isSupabaseAdminConfigured() || !isResendConfigured()) {
    return { scanned: 0, sent: 0, skipped: 0 };
  }

  const admin = createAdminClient();
  const horizon = new Date(Date.now() + 7 * MS_PER_DAY).toISOString().slice(0, 10);

  const { data: schedules, error } = await admin
    .from("vehicle_maintenance_schedules")
    .select(
      "vehicle_id, kind, next_due_km, next_due_date, part_number",
    )
    .lte("next_due_date", horizon)
    .order("next_due_date", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[maintenance-reminders] schedule load failed", error.message);
    return { scanned: 0, sent: 0, skipped: 0 };
  }

  let sent = 0;
  let skipped = 0;

  for (const row of (schedules ?? []) as ScheduleRow[]) {
    const vehicleId = row.vehicle_id;
    const kind = row.kind;
    if (!vehicleId || !kind) {
      skipped += 1;
      continue;
    }

    const { data: vehicle, error: vehicleError } = await admin
      .from("vehicles")
      .select("id, user_id, make, model")
      .eq("id", vehicleId)
      .maybeSingle();

    if (vehicleError || !vehicle) {
      skipped += 1;
      continue;
    }

    const vehicleRow = vehicle as VehicleRow;
    const { data: authData } = await admin.auth.admin.getUserById(
      vehicleRow.user_id,
    );
    if (
      !isMaintenanceEmailEnabled(
        authData.user?.user_metadata as Record<string, unknown> | undefined,
      )
    ) {
      skipped += 1;
      continue;
    }

    const tagUuid = await tagUuidForVehicle(vehicleId);
    if (!tagUuid) {
      skipped += 1;
      continue;
    }

    const daysUntil = wholeDaysUntil(row.next_due_date);
    const overdue = daysUntil < 0;
    const dueSoon = daysUntil >= 0 && daysUntil <= 7;
    if (!overdue && !dueSoon) {
      skipped += 1;
      continue;
    }

    const reminderKey = overdue
      ? maintenanceOverdueReminderKey(kind, vehicleId)
      : maintenanceDueReminderKey(kind, vehicleId);

    const reserved = await reserveReminderSend(vehicleRow.user_id, reminderKey);
    if (!reserved) {
      skipped += 1;
      continue;
    }

    const email = await resolveUserEmail(vehicleRow.user_id);
    if (!email) {
      await releaseReminderSend(vehicleRow.user_id, reminderKey);
      skipped += 1;
      continue;
    }

    const firstName = await resolveUserFirstName(vehicleRow.user_id);
    const greeting = firstName ? `Hey ${firstName},` : "Hey,";
    const vehicleLabel = `${vehicleRow.make} ${vehicleRow.model}`.trim();
    const [y, m, d] = row.next_due_date.split("-");
    const displayDate = d && m && y ? `${d}.${m}.${y}` : row.next_due_date;

    const ok = await sendMaintenanceEmail({
      email,
      greeting,
      vehicleLabel,
      kind,
      nextDueDate: displayDate,
      nextDueKm: row.next_due_km,
      partNumber: row.part_number,
      tagUuid,
      overdue,
    });

    if (!ok) {
      await releaseReminderSend(vehicleRow.user_id, reminderKey);
      skipped += 1;
      continue;
    }

    sent += 1;
  }

  return {
    scanned: schedules?.length ?? 0,
    sent,
    skipped,
  };
}
