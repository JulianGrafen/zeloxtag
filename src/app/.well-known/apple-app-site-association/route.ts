import { NextResponse } from "next/server";

import { buildAppleAppSiteAssociation } from "@/lib/capacitor/app-link-config";

export const runtime = "nodejs";

export async function GET() {
  const teamId = process.env.APPLE_TEAM_ID?.trim();
  if (!teamId) {
    return NextResponse.json(
      { error: "Universal Links not configured." },
      { status: 404 },
    );
  }

  const body = buildAppleAppSiteAssociation(teamId);
  return NextResponse.json(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
