import type { User as AuthUser } from "@supabase/supabase-js";

/** True when the user can sign in with email + password (not OAuth-only). */
export function accountHasPasswordLogin(user: AuthUser): boolean {
  return (
    user.identities?.some((identity) => identity.provider === "email") ?? false
  );
}
