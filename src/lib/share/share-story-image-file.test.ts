import { afterEach, describe, expect, it, vi } from "vitest";

import {
  canShareStoryImageFile,
  shareStoryImageFile,
} from "./share-story-image-file";

describe("shareStoryImageFile", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns unavailable when share is missing", async () => {
    const file = new File([new Uint8Array([1])], "story.png", {
      type: "image/png",
    });
    vi.stubGlobal("window", { isSecureContext: true });
    expect(canShareStoryImageFile(file)).toBe(false);
    await expect(shareStoryImageFile(file)).resolves.toBe("unavailable");
  });

  it("shares with files only when supported", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "zelox-story.png", {
      type: "image/png",
    });
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("window", { isSecureContext: true });
    vi.stubGlobal("navigator", {
      share,
      canShare: (data: { files?: File[] }) =>
        Array.isArray(data.files) && data.files.length > 0,
      userAgent: "iPhone",
    });

    expect(canShareStoryImageFile(file)).toBe(true);
    await expect(shareStoryImageFile(file)).resolves.toBe("shared");
    expect(share).toHaveBeenCalledWith({ files: [file] });
  });

  it("attempts share on mobile when canShare is false", async () => {
    const file = new File([new Uint8Array([9])], "zelox-story.png", {
      type: "image/png",
    });
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("window", { isSecureContext: true });
    vi.stubGlobal("navigator", {
      share,
      canShare: () => false,
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    });

    await expect(shareStoryImageFile(file)).resolves.toBe("shared");
    expect(share).toHaveBeenCalledWith({ files: [file] });
  });

  it("blocks share in Instagram in-app browser", async () => {
    const file = new File([new Uint8Array([1])], "story.jpg", {
      type: "image/jpeg",
    });
    const share = vi.fn();
    vi.stubGlobal("window", { isSecureContext: true });
    vi.stubGlobal("navigator", {
      share,
      canShare: () => true,
      userAgent: "Instagram 300.0.0.0",
    });

    await expect(shareStoryImageFile(file)).resolves.toBe("unavailable");
    expect(share).not.toHaveBeenCalled();
  });
});
