import type { PublicServiceBookEntry } from "@/lib/vehicles/public-showcase-data";
import { showroom } from "./showroom-styles";

type ShowroomServiceBookProps = {
  entries: PublicServiceBookEntry[];
};

export function ShowroomServiceBook({ entries }: ShowroomServiceBookProps) {
  if (entries.length === 0) return null;

  return (
    <section className={`${showroom.panel} px-4 py-4`}>
      <h2 className="font-[family-name:var(--font-display)] text-[1rem] font-semibold text-white">
        Scheckheft
      </h2>
      <ul className="mt-3 space-y-2">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"
          >
            <p className="text-[0.72rem] font-medium uppercase tracking-[0.12em] text-white/55">
              {entry.categoryLabel}
            </p>
            <p className="text-[0.92rem] font-semibold text-white">{entry.title}</p>
            <p className="mt-0.5 text-[0.78rem] text-white/60">
              {entry.date}
              {entry.mileageKm != null
                ? ` · ${entry.mileageKm.toLocaleString("de-DE")} km`
                : ""}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
