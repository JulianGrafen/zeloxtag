import type { AbeVehicleContext } from "@/lib/validations/abeSchema";

export const ABE_VEHICLE_TABLE_WATERMARK_COLUMNS = [
  "Fahrzeugtyp",
  "Betriebserlaubnis",
  "kW",
  "Reifen",
  "Auflagen",
] as const;

export type AbeVehicleTableWatermarkRow = readonly [
  string,
  string,
  string,
  string,
  string,
];

const NEIGHBOR_ABOVE: AbeVehicleTableWatermarkRow = [
  "…",
  "…",
  "…",
  "…",
  "…",
];

const NEIGHBOR_BELOW: AbeVehicleTableWatermarkRow = [
  "…",
  "…",
  "…",
  "…",
  "…",
];

const CELL =
  "border border-white/28 px-0.5 py-1 text-center align-middle tracking-wide";

export function buildAbeVehicleTableExcerptRow(
  vehicleContext?: AbeVehicleContext | null,
): AbeVehicleTableWatermarkRow {
  const typ = vehicleContext?.type?.trim() || "Typ";
  const egBe = shortenEgBe(vehicleContext?.egBe);
  return [typ, egBe, "kW", "Reifen", "Auflagen"];
}

export function formatAbeVehicleTableCaption(
  vehicleContext?: AbeVehicleContext | null,
): string {
  const label = [vehicleContext?.brand, vehicleContext?.model]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  return label || "Verkaufsbezeichnung";
}

function shortenEgBe(value?: string): string {
  const trimmed = value?.trim();
  if (!trimmed) return "e1*…";
  return trimmed.length > 14 ? `${trimmed.slice(0, 12)}…` : trimmed;
}

/**
 * Ghost Verwendungsbereich excerpt — cropped to the garage vehicle row
 * so the user frames only the relevant table slice.
 */
export function AbeVehicleTableWatermark({
  vehicleContext = null,
}: {
  vehicleContext?: AbeVehicleContext | null;
}) {
  const caption = formatAbeVehicleTableCaption(vehicleContext);
  const excerptRow = buildAbeVehicleTableExcerptRow(vehicleContext);

  return (
    <div
      className="pointer-events-none w-full select-none text-white/42 [text-shadow:0_1px_10px_rgba(0,0,0,0.5)]"
      aria-hidden
    >
      <p className="mb-1 text-center text-[clamp(0.55rem,2.3vw,0.75rem)] font-semibold uppercase tracking-[0.12em]">
        {caption}
      </p>
      <div className="relative overflow-hidden rounded-md">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr>
              {ABE_VEHICLE_TABLE_WATERMARK_COLUMNS.map((column) => (
                <th
                  key={column}
                  className={`${CELL} text-[clamp(0.4rem,1.8vw,0.6rem)] font-semibold uppercase`}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="opacity-35">
              {NEIGHBOR_ABOVE.map((cell, index) => (
                <td
                  key={`above-${index}`}
                  className={`${CELL} text-[clamp(0.36rem,1.5vw,0.52rem)]`}
                >
                  {cell}
                </td>
              ))}
            </tr>
            <tr>
              {excerptRow.map((cell, index) => (
                <td
                  key={`excerpt-${ABE_VEHICLE_TABLE_WATERMARK_COLUMNS[index]}`}
                  className={`${CELL} text-[clamp(0.42rem,1.75vw,0.6rem)] font-semibold text-white/55`}
                >
                  {cell}
                </td>
              ))}
            </tr>
            <tr className="opacity-35">
              {NEIGHBOR_BELOW.map((cell, index) => (
                <td
                  key={`below-${index}`}
                  className={`${CELL} text-[clamp(0.36rem,1.5vw,0.52rem)]`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-1.5 text-center text-[clamp(0.48rem,2vw,0.62rem)] font-medium tracking-wide text-white/40">
        Nur die Zeile deines Fahrzeugs
      </p>
    </div>
  );
}
