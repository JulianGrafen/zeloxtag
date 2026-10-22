import type { WeeklyTopBuild } from "@/lib/showcase/weekly-top-builds-map";

export function formatDemoBuildOfWeekLabel(
  build: WeeklyTopBuild | null | undefined,
): string | null {
  if (!build) return null;
  const name = [build.make, build.model].filter(Boolean).join(" ").trim();
  if (!name) return `Build der Woche · ${build.weeklyLikes} Likes`;
  return `Build der Woche · ${name}`;
}
