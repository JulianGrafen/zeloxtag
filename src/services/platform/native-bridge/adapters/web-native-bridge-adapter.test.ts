import { afterEach, describe, expect, it, vi } from "vitest";

import { WebNativeBridgeAdapter } from "@/services/platform/native-bridge/adapters/web-native-bridge-adapter";

vi.mock("@/lib/share/share-story-image-file", () => ({
  downloadStoryImageFile: vi.fn(),
}));

describe("WebNativeBridgeAdapter shareContent", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("falls back to download when share API missing", async () => {
    vi.stubGlobal("navigator", {});
    vi.stubGlobal("window", { isSecureContext: true });

    const adapter = new WebNativeBridgeAdapter();
    const file = new File(["x"], "story.png", { type: "image/png" });
    const result = await adapter.shareContent({ files: [file] });
    expect(result).toBe("copied");
  });
});
