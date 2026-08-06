import type { NextRequest } from "next/server";

import { POST as photoPost } from "../photo/route";

export const runtime = "nodejs";
export const maxDuration = 60;

/** @deprecated Use POST /api/vehicle/photo — kept for cached clients. */
export async function POST(request: NextRequest) {
  return photoPost(request);
}
