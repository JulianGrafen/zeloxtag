import { createClient } from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Persist the owner's preferred dashboard tag on the auth user (non-fatal). */
export async function rememberActiveTagUuid(tagUuid: string): Promise<void> {
  const trimmed = tagUuid.trim();
  if (!UUID_RE.test(trimmed)) return;
  try {
    const supabase = await createClient();
    await supabase.auth.updateUser({
      data: { active_tag_uuid: trimmed },
    });
  } catch {
    /* non-fatal */
  }
}
