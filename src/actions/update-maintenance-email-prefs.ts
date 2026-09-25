"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";

export type UpdateMaintenanceEmailPrefsResult =
  | { status: "ok"; enabled: boolean }
  | { status: "error"; message: string };

export async function updateMaintenanceEmailRemindersAction(
  enabled: boolean,
): Promise<UpdateMaintenanceEmailPrefsResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { status: "error", message: "Nicht angemeldet." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    data: {
      maintenance_email_reminders: enabled,
    },
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/settings");
  return { status: "ok", enabled };
}
