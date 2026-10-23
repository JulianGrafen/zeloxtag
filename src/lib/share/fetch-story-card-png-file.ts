import { apiFetch } from "@/lib/api/api-fetch";
import {
  buildStoryCardOgApiPath,
  type StoryCardOgUrlOptions,
} from "@/lib/share/build-story-card-og-url";

export class StoryCardFetchError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "StoryCardFetchError";
    this.status = status;
  }
}

export async function fetchStoryCardPngFile(
  vehicleId: string,
  filename: string,
  options?: StoryCardOgUrlOptions,
): Promise<File> {
  const response = await apiFetch(buildStoryCardOgApiPath(vehicleId, options), {
    method: "GET",
    headers: { Accept: "image/png" },
  });

  if (!response.ok) {
    let message = "Story-Bild konnte nicht geladen werden.";
    if (response.status === 401) {
      message = "Bitte erneut anmelden, um das Story-Bild zu teilen.";
    } else if (response.status === 403) {
      message = "Keine Berechtigung für dieses Story-Bild.";
    } else if (response.status === 422) {
      message =
        "Showcase-Daten reichen noch nicht für ein Story-Bild — Specs oder Umbauten ergänzen.";
    }
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error?.trim()) {
        message = body.error.trim();
      }
    } catch {
      /* non-JSON error body */
    }
    throw new StoryCardFetchError(message, response.status);
  }

  const blob = await response.blob();
  const type = blob.type || "image/png";
  return new File([blob], filename, { type });
}
