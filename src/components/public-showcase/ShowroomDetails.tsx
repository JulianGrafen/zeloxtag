import type { PublicShowcaseProfile } from "@/lib/vehicles/public-showcase-data";

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
  if (rows.length === 0 && !profile.notes) {
    return null;
  }

  return (
    <section className="space-y-3 px-4">
      {rows.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
          <p className="border-b border-white/10 px-4 py-2.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-zinc-400">
            Technische Daten
          </p>
          <dl className="divide-y divide-white/10">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex items-start justify-between gap-4 px-4 py-3"
              >
                <dt className="text-[0.78rem] text-zinc-400">{row.label}</dt>
                <dd className="text-right text-[0.88rem] font-medium text-zinc-100">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {profile.notes ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 backdrop-blur-md">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-zinc-400">
            Notizen
          </p>
          <p className="mt-2 whitespace-pre-wrap text-[0.88rem] leading-relaxed text-zinc-200">
            {profile.notes}
          </p>
        </div>
      ) : null}
    </section>
  );
}
