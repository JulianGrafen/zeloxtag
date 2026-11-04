import { describe, expect, it } from "vitest";

import {
  SHOWCASE_SETUP_MIN_SPEC_FIELDS,
  buildShowcaseSetupProgress,
  type ShowcaseSetupInput,
} from "./showcase-setup-progress";

const EMPTY: ShowcaseSetupInput = {
  hasPhoto: false,
  filledSpecCount: 0,
  modificationCount: 0,
  galleryPhotoCount: 0,
  hasDynoChart: false,
  hasSound: false,
  isPublic: false,
};

describe("buildShowcaseSetupProgress", () => {
  it("starts with the vehicle photo for an empty showcase", () => {
    const progress = buildShowcaseSetupProgress(EMPTY);
    expect(progress.doneCount).toBe(0);
    expect(progress.percent).toBe(0);
    expect(progress.nextStep?.id).toBe("photo");
  });

  it("requires a minimum number of spec fields", () => {
    const below = buildShowcaseSetupProgress({
      ...EMPTY,
      hasPhoto: true,
      filledSpecCount: SHOWCASE_SETUP_MIN_SPEC_FIELDS - 1,
    });
    expect(below.nextStep?.id).toBe("specs");

    const enough = buildShowcaseSetupProgress({
      ...EMPTY,
      hasPhoto: true,
      filledSpecCount: SHOWCASE_SETUP_MIN_SPEC_FIELDS,
    });
    expect(enough.nextStep?.id).toBe("modifications");
  });

  it("reports completion when every step is done", () => {
    const progress = buildShowcaseSetupProgress({
      hasPhoto: true,
      filledSpecCount: 8,
      modificationCount: 2,
      galleryPhotoCount: 4,
      hasDynoChart: true,
      hasSound: true,
      isPublic: true,
    });
    expect(progress.doneCount).toBe(progress.totalCount);
    expect(progress.percent).toBe(100);
    expect(progress.nextStep).toBeNull();
  });
});
