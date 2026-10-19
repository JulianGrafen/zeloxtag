import { describe, expect, it } from "vitest";

import {
  parseShareCardQuery,
  shareCardDimensions,
  shareCardQuerySchema,
} from "./share-card-variant";

describe("shareCardDimensions", () => {
  it("returns story and post pixel sizes", () => {
    expect(shareCardDimensions("story")).toEqual({ width: 1080, height: 1920 });
    expect(shareCardDimensions("post")).toEqual({ width: 1080, height: 1440 });
  });
});

describe("parseShareCardQuery", () => {
  it("defaults to story showcase", () => {
    expect(parseShareCardQuery(new URLSearchParams())).toEqual({
      format: "story",
      style: "showcase",
    });
  });

  it("parses explicit format and style", () => {
    const params = new URLSearchParams({
      format: "post",
      style: "rankHero",
    });
    expect(parseShareCardQuery(params)).toEqual({
      format: "post",
      style: "rankHero",
    });
  });

  it("rejects unknown values", () => {
    expect(() =>
      shareCardQuerySchema.parse({ format: "square", style: "showcase" }),
    ).toThrow();
  });
});
