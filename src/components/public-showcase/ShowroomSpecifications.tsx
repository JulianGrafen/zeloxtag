import type { PublicShowcaseProfile } from "@/lib/vehicles/public-showcase-data";

import { showroom } from "./showroom-styles";

type ShowroomSpecificationsProps = {
  profile: PublicShowcaseProfile;
};

export function ShowroomSpecifications({ profile }: ShowroomSpecificationsProps) {
  if (!profile.notes?.trim()) return null;

  return (
    <section className="px-4">
      <div className={`${showroom.panelFlat} px-4 py-3.5`}>
        <p className={showroom.sectionTitle}>Spezifikationen</p>
        <p className={`mt-2 whitespace-pre-wrap ${showroom.body}`}>
          {profile.notes.trim()}
        </p>
      </div>
    </section>
  );
}
