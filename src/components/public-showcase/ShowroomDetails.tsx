import type { PublicShowcaseProfile } from "@/lib/vehicles/public-showcase-data";

import { showroom } from "./showroom-styles";

type ShowroomDetailsProps = {
  profile: PublicShowcaseProfile;
};

type DetailRow = {
  label: string;
  value: string;
};

function buildRows(profile: PublicShowcaseProfile): DetailRow[] {
  const rows: DetailRow[] = [];
  if (profile.displacementCc != null) {
    rows.push({
      label: "Hubraum",
      value: `${profile.displacementCc.toLocaleString("de-DE")} ccm`,
    });
  }
  if (profile.fuelType) rows.push({ label: "Kraftstoff", value: profile.fuelType });
  if (profile.bodyType) rows.push({ label: "Karosserie", value: profile.bodyType });
  if (profile.color) rows.push({ label: "Farbe", value: profile.color });
  if (profile.mileageKm != null) {
    rows.push({
      label: "Kilometer",
      value: `${profile.mileageKm.toLocaleString("de-DE")} km`,
    });
  }
  return rows;
}

export function ShowroomDetails({ profile }: ShowroomDetailsProps) {
  const rows = buildRows(profile);
  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3 px-4">
      <div className={showroom.panel}>
        <p
          className={`border-b border-white/15 px-4 py-2.5 ${showroom.sectionTitle}`}
        >
          Technische Daten
        </p>
        <dl className="divide-y divide-white/10">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-start justify-between gap-4 px-4 py-3"
            >
              <dt className={showroom.label}>{row.label}</dt>
              <dd className={`text-right ${showroom.value}`}>{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
