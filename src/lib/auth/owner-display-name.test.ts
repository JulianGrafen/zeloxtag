import { describe, expect, it } from "vitest";

import { ownerDisplayNameFromMetadata } from "@/lib/auth/owner-display-name";

describe("ownerDisplayNameFromMetadata", () => {
  it("prefers name then full_name", () => {
    expect(
      ownerDisplayNameFromMetadata({
        user_metadata: { full_name: "Full", name: "Short" },
      }),
    ).toBe("Short");
  });

  it("falls back to display_name", () => {
    expect(
      ownerDisplayNameFromMetadata({
        user_metadata: { display_name: "Display" },
      }),
    ).toBe("Display");
  });
});
