"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";

export type UpdateTagScanEmailPrefsResult =
  | { status: "ok"; enabled: boolean }
  | { status: "error"; message: string };

/** Live-Scan e-mails („Dein Fahrzeug wurde gerade gescannt“) on/off. */
export async function updateTagScanEmailNotificationsAction(
  enabled: boolean,
): Promise<UpdateTagScanEmailPrefsResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { status: "error", message: "Nicht angemeldet." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    data: { tag_scan_email_notifications: enabled },
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/settings");
  return { status: "ok", enabled };
}
