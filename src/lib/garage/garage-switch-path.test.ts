import { describe, expect, it } from "vitest";

import { garageSwitchPath } from "./garage-switch-path";

describe("garageSwitchPath", () => {
  it("preserves sub-path and query when switching tags", () => {
    expect(
      garageSwitchPath(
        "/v/old-tag/dokumente",
        "?type=abe",
        "old-tag",
        "new-tag",
      ),
    ).toBe("/v/new-tag/dokumente?type=abe");
  });

  it("falls back to dashboard root for unrelated paths", () => {
    expect(
      garageSwitchPath("/settings", "", "old-tag", "new-tag"),
    ).toBe("/v/new-tag");
  });
});
