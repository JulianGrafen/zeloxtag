import { describe, expect, it } from "vitest";

import { mapGarageRows } from "./map-garage-rows";

describe("mapGarageRows", () => {
  it("maps tag+vehicle joins and sorts by input order", () => {
    const rows = mapGarageRows([
      {
        uuid: "tag-a",
        vehicle_id: "veh-1",
        vehicles: {
          id: "veh-1",
          make: "BMW",
          model: "M3",
          year: 2020,
        },
      },
      {
        uuid: "tag-b",
        vehicle_id: "veh-2",
        vehicles: {
          id: "veh-2",
          make: "VW",
          model: "Golf",
          year: 2018,
        },
      },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      vehicleId: "veh-1",
      tagUuid: "tag-a",
      label: "BMW M3",
      year: 2020,
    });
    expect(rows[1]?.tagUuid).toBe("tag-b");
  });

  it("skips rows without a linked vehicle", () => {
    expect(
      mapGarageRows([
        { uuid: "orphan", vehicle_id: null, vehicles: null },
      ]),
    ).toEqual([]);
  });
});
