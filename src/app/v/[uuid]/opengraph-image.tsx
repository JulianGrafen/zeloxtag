import { ImageResponse } from "next/og";

import { OgImageTemplate } from "@/lib/seo/og-image-template";
import { SHOWCASE_OG_DESCRIPTION } from "@/lib/seo/open-graph";
import { resolvePublicVehicleEntry } from "@/lib/vehicles/get-public-vehicle";

export const alt = "ZeloxTag Fahrzeug-Showcase";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type RouteProps = {
  params: Promise<{ uuid: string }>;
};

export default async function VehicleOpenGraphImage({ params }: RouteProps) {
  const { uuid } = await params;
  const entry = await resolvePublicVehicleEntry(uuid);

  let title = "Fahrzeug-Showcase";
  let subtitle = SHOWCASE_OG_DESCRIPTION;

  if (entry?.kind === "slug" && entry.vehicle.is_public) {
    const vehicle = entry.vehicle;
    title = [vehicle.make, vehicle.model, vehicle.year]
      .filter(Boolean)
      .join(" ");
    subtitle = `${vehicle.make} ${vehicle.model} — öffentliches ZeloxTag-Profil`;
  } else if (entry?.kind === "tag" && entry.result.vehicle?.is_public) {
    const vehicle = entry.result.vehicle;
    title = [vehicle.make, vehicle.model, vehicle.year]
      .filter(Boolean)
      .join(" ");
    subtitle = `${vehicle.make} ${vehicle.model} — öffentliches ZeloxTag-Profil`;
  }

  return new ImageResponse(
    (
      <OgImageTemplate
        kicker="Showcase"
        title={title}
        subtitle={subtitle}
      />
    ),
    size,
  );
}
