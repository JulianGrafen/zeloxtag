import type { WeeklyTopBuild } from "@/lib/showcase/weekly-top-builds-map";

export async function fetchWeeklyTopBuildsClient(
  limit = 10,
): Promise<WeeklyTopBuild[]> {
  const response = await fetch(
    `/api/showcase/swipe/weekly-top?limit=${limit}`,
    { credentials: "same-origin" },
  );
  const json = (await response.json()) as {
    ok?: boolean;
    builds?: WeeklyTopBuild[];
  };
  if (!response.ok || !json.ok || !Array.isArray(json.builds)) {
    throw new Error("weekly_top_load_failed");
  }
  return json.builds;
}
