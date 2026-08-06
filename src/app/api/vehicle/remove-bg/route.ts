import { POST as photoPost, maxDuration, runtime } from "../photo/route";

export { maxDuration, runtime };

/** @deprecated Use POST /api/vehicle/photo — kept for cached clients. */
export async function POST(request: Request) {
  return photoPost(request as import("next/server").NextRequest);
}
