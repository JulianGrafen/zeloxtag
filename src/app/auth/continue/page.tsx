import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/get-user";
import { resolveAuthContinueHref } from "@/lib/auth/resolve-auth-continue-href";

/**
 * Post-auth navigation target for `<Link>` and direct visits.
 * (Route handler at `route.ts` remains for POST / 307 from login.)
 */
export default async function AuthContinuePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  const href = await resolveAuthContinueHref(user?.id, next);
  redirect(href);
}
