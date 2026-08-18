import { describe, expect, it } from "vitest";

import { normalizeAbeTableExtraction } from "@/lib/validations/abeTableExtractionSchemas";

describe("abeTableExtractionSchemas", () => {
  it("strips type codes and EG-BE from model_name", () => {
    const normalized = normalizeAbeTableExtraction({
      vehicles: [
        {
          model_name: "BMW 3er-Reihe 346L e1*97/27*0097*",
          configurations: [
            {
              kw_range: "85-141",
              tire_size: "205/50R17",
              auflagen_codes: ["K 2b", "A01"],
            },
          ],
        },
      ],
    });

    expect(normalized.vehicles[0]?.model_name).toBe("BMW 3er-Reihe");
    expect(normalized.vehicles[0]?.configurations[0]?.auflagen_codes).toEqual([
      "K2B",
      "A01",
    ]);
  });

  it("drops vehicles without configurations", () => {
    const normalized = normalizeAbeTableExtraction({
      vehicles: [
        {
          model_name: "Golf",
          configurations: [],
        },
        {
          model_name: "BMW 1er-Reihe",
          configurations: [
            {
              kw_range: "",
              tire_size: "215/45R17",
              auflagen_codes: ["744"],
            },
          ],
        },
      ],
    });

    expect(normalized.vehicles).toHaveLength(1);
    expect(normalized.vehicles[0]?.model_name).toBe("BMW 1er-Reihe");
  });

  it("groups multiple configurations under one vehicle", () => {
    const normalized = normalizeAbeTableExtraction({
      vehicles: [
        {
          model_name: "BMW 3er-Reihe",
          configurations: [
            {
              kw_range: "85-141",
              tire_size: "205/50R17",
              auflagen_codes: ["A01"],
            },
            {
              kw_range: "105-195",
              tire_size: "225/45R17",
              auflagen_codes: ["A02", "K41"],
            },
          ],
        },
      ],
    });

    expect(normalized.vehicles[0]?.configurations).toHaveLength(2);
  });

  it("keeps all tire sizes when multiple are printed in one Reifen cell", () => {
    const normalized = normalizeAbeTableExtraction({
      vehicles: [
        {
          model_name: "BMW 3er-Compact",
          configurations: [
            {
              kw_range: "85-141",
              tire_size: "215/45R17, 225/45R17",
              auflagen_codes: ["K2b"],
            },
          ],
        },
      ],
    });

    expect(normalized.vehicles[0]?.configurations[0]?.tire_size).toBe(
      "215/45 R17, 225/45 R17",
    );
  });
});
