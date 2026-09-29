import { describe, expect, it } from "vitest";

import { mapGarageVehicleRows } from "./map-garage-rows";

describe("mapGarageVehicleRows", () => {
  it("includes tagless vehicles", () => {
    const rows = mapGarageVehicleRows([
      {
        id: "v1",
        make: "VW",
        model: "Golf",
        year: 2019,
        tags: null,
      },
      {
        id: "v2",
        make: "BMW",
        model: "M2",
        year: 2020,
        tags: [{ uuid: "tag-uuid", status: "active" }],
      },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0]?.tagUuid).toBeNull();
    expect(rows[1]?.tagUuid).toBe("tag-uuid");
  });
});
