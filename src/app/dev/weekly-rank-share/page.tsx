import { notFound } from "next/navigation";

import { WeeklyRankShareMockClient } from "./weekly-rank-share-mock-client";

/** Local-only preview for weekly rank Story export. */
export default function WeeklyRankShareDevPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <WeeklyRankShareMockClient />;
}
