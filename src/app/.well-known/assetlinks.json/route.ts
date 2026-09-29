import { NextResponse } from "next/server";

import {
  buildAndroidAssetLinks,
  parseAndroidSha256Fingerprints,
} from "@/lib/capacitor/app-link-config";

export const runtime = "nodejs";

export async function GET() {
  const fingerprints = parseAndroidSha256Fingerprints(
    process.env.ANDROID_APP_LINK_SHA256,
  );
  if (fingerprints.length === 0) {
    return NextResponse.json(
      { error: "App Links not configured." },
      { status: 404 },
    );
  }

  const body = buildAndroidAssetLinks(fingerprints);
  return NextResponse.json(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
