import type { Metadata } from "next";
import { Wrench } from "lucide-react";

import { getInvitePreview } from "@/actions/vehicle-contributors";
import { AcceptInvitePanel } from "@/components/contributors/accept-invite-panel";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/auth/get-user";

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export const metadata: Metadata = {
  title: "Schrauber-Einladung · ZeloxTag",
  description: "Einladung annehmen und Reparaturen eintragen.",
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const preview = await getInvitePreview(token);
  const user = await getCurrentUser();
  const loginHref = `/login?next=${encodeURIComponent(`/einladung/${token}`)}`;

  return (
    <AppShell showNavbar={false}>
      <section className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-12 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-5">
        <div className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-6 shadow-[var(--vd-shadow)]">
          <p className="flex items-center gap-2 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
            <Wrench className="h-3.5 w-3.5" aria-hidden />
            Schrauber-Zugang
          </p>

          {preview.status === "error" ? (
            <>
              <h1 className="mt-3 font-[family-name:var(--font-display)] text-[1.65rem] font-semibold tracking-[-0.035em] text-[color:var(--vd-text)]">
                Einladung ungültig
              </h1>
              <p className="mt-3 text-[0.92rem] leading-relaxed text-[color:var(--vd-muted)]">
                {preview.message}
              </p>
            </>
          ) : (
            <>
              <h1 className="mt-3 font-[family-name:var(--font-display)] text-[1.65rem] font-semibold tracking-[-0.035em] text-[color:var(--vd-text)]">
                {preview.vehicleLabel}
              </h1>
              <p className="mt-3 text-[0.92rem] leading-relaxed text-[color:var(--vd-muted)]">
                Du wurdest eingeladen, Reparaturen und Service-Belege für dieses
                Fahrzeug einzutragen.
              </p>
              <div className="mt-5">
                <AcceptInvitePanel
                  token={token}
                  vehicleLabel={preview.vehicleLabel}
                  label={preview.label}
                  tagUuid={preview.tagUuid}
                  expired={preview.expired}
                  alreadyActive={preview.alreadyActive}
                  isAuthenticated={Boolean(user)}
                  loginHref={loginHref}
                />
              </div>
            </>
          )}
        </div>
      </section>
    </AppShell>
  );
}
