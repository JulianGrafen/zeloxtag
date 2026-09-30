import { describe, expect, it } from "vitest";

import { appendSavedQuery } from "@/lib/ui/saved-toast";

describe("appendSavedQuery", () => {
  it("appends saved=1 to paths without query", () => {
    expect(appendSavedQuery("/garage/id/dokumente")).toBe(
      "/garage/id/dokumente?saved=1",
    );
  });

  it("appends saved=1 to existing query strings", () => {
    expect(appendSavedQuery("/v/tag/dokumente?type=invoice")).toBe(
      "/v/tag/dokumente?type=invoice&saved=1",
    );
  });
});
