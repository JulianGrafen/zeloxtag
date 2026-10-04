import { describe, expect, it } from "vitest";

import { parseJsonbRpcArray } from "@/lib/showcase/parse-jsonb-rpc-array";

describe("parseJsonbRpcArray", () => {
  it("returns arrays as-is", () => {
    expect(parseJsonbRpcArray([{ a: 1 }])).toEqual([{ a: 1 }]);
  });

  it("parses JSON string arrays", () => {
    expect(parseJsonbRpcArray('[{"public_slug":"x"}]')).toEqual([
      { public_slug: "x" },
    ]);
  });

  it("returns empty for nullish and invalid", () => {
    expect(parseJsonbRpcArray(null)).toEqual([]);
    expect(parseJsonbRpcArray("not-json")).toEqual([]);
    expect(parseJsonbRpcArray({})).toEqual([]);
  });
});
