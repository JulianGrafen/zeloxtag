import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AddTagToGarageFlow } from "@/components/garage/add-tag-to-garage-flow";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/auth/get-user";
import { resolveClaimTagState } from "@/lib/garage/resolve-claim-tag-state";
import {
  CLAIM_UNAVAILABLE_MESSAGE,
  isClaimLandingIdentifier,
} from "@/lib/tags/claim-landing";

export const metadata: Metadata = {
  title: "Tag beanspruchen · ZeloxTag",
  description: "ZeloxTag einer bestehenden Garage hinzufügen.",
};

interface ClaimTagPageProps {
  params: Promise<{ uuid: string }>;
}

export default async function ClaimTagPage({ params }: ClaimTagPageProps) {
  const { uuid: rawUuid } = await params;
  const tagUuid = rawUuid.trim();

  if (!isClaimLandingIdentifier(tagUuid)) {
    redirect("/");
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/?next=${encodeURIComponent(`/claim/${tagUuid}`)}`);
  }

  const state = await resolveClaimTagState(tagUuid, user.id);

  if (state.kind === "owned_by") {
    redirect(`/v/${state.tagUuid}`);
  }

  if (state.kind !== "unclaimed") {
    return (
      <AppShell showNavbar={false}>
        <div className="mx-auto max-w-lg px-4 py-10">
          <div className="vd-surface-card p-6 text-center">
            <p className="claim-kicker">Tag</p>
            <h1 className="claim-title mt-2">Nicht verfügbar</h1>
            <p className="claim-copy mt-3">{CLAIM_UNAVAILABLE_MESSAGE}</p>
            <Link href="/dashboard" className="claim-cta mt-6 inline-flex no-underline">
              Zum Dashboard
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell showNavbar={false}>
      <AddTagToGarageFlow tagUuid={tagUuid} />
    </AppShell>
  );
}
