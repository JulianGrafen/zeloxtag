import { NextResponse, type NextRequest } from "next/server";

import { processDueMaintenanceReminderEmails } from "@/lib/email/maintenance-reminders";
import { isAuthorizedCronRequest } from "@/lib/security/cron-auth";

export const runtime = "nodejs";

/**
 * GET /api/cron/maintenance-reminders
 * Sends oil/brake due and overdue emails from vehicle_maintenance_schedules.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await processDueMaintenanceReminderEmails(80);
  return NextResponse.json({ ok: true, ...result });
}
