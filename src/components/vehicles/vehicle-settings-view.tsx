"use client";

import {
  AudioLines,
  BookOpen,
  Camera,
  Car,
  ChartSpline,
  FileText,
  Globe,
  Images,
  Link2,
  Share2,
  ShieldCheck,
  Wrench,
} from "lucide-react";

import { IOSGroupedList } from "@/components/ui/ios";
import { ShowcaseSetupStatusCard } from "@/components/vehicles/showcase-setup-status-card";
import { VehicleSettingsSubmenuLink } from "@/components/vehicles/vehicle-settings-submenu-link";
import {
  MAX_SHOWCASE_GALLERY_PHOTOS,
  filterShowcaseGalleryDocuments,
} from "@/lib/documents/showcase-gallery";
import { topThreeWeeklyRankOrNull } from "@/lib/showcase/vehicle-weekly-showcase-rank-helpers";
import type { VehicleWeeklyShowcaseRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-map";
import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";
import { countBuildStoryChronikDocuments } from "@/lib/vehicles/build-story-owner-entries";
import { resolveOwnerDynoChartViewUrl } from "@/lib/vehicles/dyno-chart-constants";
import { resolveOwnerEngineSoundViewUrl } from "@/lib/vehicles/engine-sound-constants";
import {
  publicProfileStatusSubtitle,
  resolveShowcaseSharePath,
} from "@/lib/vehicles/public-profile-status";
import { partitionShowcaseSelectableDocuments } from "@/lib/vehicles/public-showcase-documents";
import { publicShowcasePath } from "@/lib/vehicles/public-slug";
import {
  buildShowcaseSetupProgress,
  type ShowcaseSetupStepId,
} from "@/lib/vehicles/showcase-setup-progress";
import {
  countFilledTechSpecs,
  parseVehicleTechSpecs,
} from "@/lib/vehicles/tech-specs";
import type { Document, Vehicle } from "@/types/database";

type VehicleSettingsViewProps = {
  surfaceScope: VehicleSurfaceScope;
  vehicle: Vehicle;
  documents: Document[];
  galleryPhotos: Document[];
  canEdit: boolean;
  isExposeActive: boolean;
  hasLinkedTag: boolean;
  weeklyRank?: VehicleWeeklyShowcaseRank | null;
};

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * Vehicle settings hub. Sorted by the owner's workflow:
 * 1. Fahrzeug — identity and technical data
 * 2. Showcase-Inhalte — everything that fills the public profile
 * 3. Sichtbarkeit & Teilen — who sees it and how to share
 * 4. Verkaufen — exposé
 * 5. Konto
 */
export function VehicleSettingsView({
  surfaceScope,
  vehicle,
  documents,
  galleryPhotos,
  canEdit,
  isExposeActive,
  hasLinkedTag,
  weeklyRank = null,
}: VehicleSettingsViewProps) {
  const href = (segment: string) => vehicleSurfaceHref(surfaceScope, segment);

  const specs = parseVehicleTechSpecs(vehicle.tech_specs);
  const filledSpecCount = countFilledTechSpecs(specs);
  const hasPhoto = Boolean(vehicle.silhouette_image_url?.trim());
  const galleryPhotoCount = filterShowcaseGalleryDocuments(galleryPhotos).length;
  const hasDynoChart = Boolean(
    resolveOwnerDynoChartViewUrl(vehicle.id, specs.dynoChartUrl),
  );
  const hasSound = Boolean(
    resolveOwnerEngineSoundViewUrl(vehicle.id, vehicle.sound_url),
  );
  const isPublic = Boolean(vehicle.is_public);

  const { invoices, modifications, manualEntries } =
    partitionShowcaseSelectableDocuments(documents);
  const entryCount = modifications.length + manualEntries.length;
  const visibleCount = [...modifications, ...manualEntries, ...invoices].filter(
    (doc) => doc.show_on_public_showcase,
  ).length;
  const chronikCount = countBuildStoryChronikDocuments(documents);

  const progress = buildShowcaseSetupProgress({
    hasPhoto,
    filledSpecCount,
    modificationCount: entryCount,
    galleryPhotoCount,
    hasDynoChart,
    hasSound,
    isPublic,
  });

  const stepHref: Record<ShowcaseSetupStepId, string> = {
    photo: href("daten/fahrzeugbild"),
    specs: href("daten"),
    modifications: `${href("umbauten")}?neu=1`,
    gallery: href("einstellungen/galerie"),
    dyno: href("einstellungen/leistungsdiagramm"),
    sound: href("einstellungen/soundcheck"),
    public: href("einstellungen/profil"),
  };

  const previewHref = resolveShowcaseSharePath({
    isPublic,
    publicSlug: vehicle.public_slug,
    pathForSlug: publicShowcasePath,
  });

  const modificationsSubtitle =
    entryCount + invoices.length === 0
      ? "Umbauten mit Foto erfassen, Rechnungen auswählen"
      : [
          modifications.length > 0
            ? pluralize(modifications.length, "Umbau", "Umbauten")
            : null,
          manualEntries.length > 0
            ? pluralize(manualEntries.length, "Eintrag", "Einträge")
            : null,
          invoices.length > 0
            ? pluralize(invoices.length, "Rechnung", "Rechnungen")
            : null,
          visibleCount > 0 ? `${visibleCount} sichtbar` : null,
        ]
          .filter(Boolean)
          .join(" · ");

  const topThree = topThreeWeeklyRankOrNull(weeklyRank?.rank ?? 0);

  return (
    <div className="flex flex-col gap-6">
      <ShowcaseSetupStatusCard
        vehicleTitle={`${vehicle.make} ${vehicle.model}`.trim()}
        isPublic={isPublic}
        progress={progress}
        nextStepHref={progress.nextStep ? stepHref[progress.nextStep.id] : null}
        previewHref={previewHref}
        canEdit={canEdit}
      />

      <IOSGroupedList
        headerTitle="Fahrzeug"
        footerText="Basis für Profil, Quartett-Werte und Exposé."
      >
        <VehicleSettingsSubmenuLink
          href={href("daten")}
          icon={Car}
          iconTone="blue"
          title="Fahrzeugdaten"
          subtitle="Stammdaten, Leistung, Technik, Wartung"
          value={filledSpecCount > 0 ? `${filledSpecCount} Felder` : "Leer"}
        />
        <VehicleSettingsSubmenuLink
          href={href("daten/fahrzeugbild")}
          icon={Camera}
          iconTone="blue"
          title="Fahrzeugbild"
          subtitle="Freigestelltes Titelbild"
          value={hasPhoto ? "Hinterlegt" : "Fehlt"}
          isLast
        />
      </IOSGroupedList>

      <IOSGroupedList
        headerTitle="Showcase-Inhalte"
        footerText="Was Besucher auf deinem öffentlichen Profil sehen."
      >
        <VehicleSettingsSubmenuLink
          href={href("einstellungen/umbauten")}
          icon={Wrench}
          iconTone="amber"
          title="Umbauten & Belege"
          subtitle={modificationsSubtitle}
        />
        <VehicleSettingsSubmenuLink
          href={href("einstellungen/galerie")}
          icon={Images}
          iconTone="amber"
          title="Galerie"
          subtitle={`Bis zu ${MAX_SHOWCASE_GALLERY_PHOTOS} Fotos`}
          value={`${galleryPhotoCount}/${MAX_SHOWCASE_GALLERY_PHOTOS}`}
        />
        <VehicleSettingsSubmenuLink
          href={href("einstellungen/leistungsdiagramm")}
          icon={ChartSpline}
          iconTone="amber"
          title="Leistungsdiagramm"
          subtitle="Prüfstandslauf als Bild oder PDF"
          value={hasDynoChart ? "Hinterlegt" : "Fehlt"}
        />
        <VehicleSettingsSubmenuLink
          href={href("einstellungen/soundcheck")}
          icon={AudioLines}
          iconTone="amber"
          title="Soundcheck"
          subtitle="Motorsound für den Start-Button"
          value={hasSound ? "Aktiv" : "Fehlt"}
          isLast
        />
      </IOSGroupedList>

      <IOSGroupedList headerTitle="Sichtbarkeit & Teilen">
        <VehicleSettingsSubmenuLink
          href={href("einstellungen/profil")}
          icon={Globe}
          iconTone="green"
          title="Öffentliches Profil"
          subtitle="Sichtbarkeit, Build-Swipe, Finanzen"
          value={publicProfileStatusSubtitle({
            isPublic,
            showcaseSwipeOptIn: Boolean(vehicle.showcase_swipe_opt_in),
            hasLinkedTag,
          })}
        />
        <VehicleSettingsSubmenuLink
          href={href("einstellungen/umbauten")}
          icon={BookOpen}
          iconTone="green"
          title="Build-Chronik"
          subtitle={
            chronikCount > 0
              ? `${pluralize(chronikCount, "Eintrag", "Einträge")} in der Timeline`
              : "Umbauten mit Foto als Timeline"
          }
          value={vehicle.is_story_public ? "Öffentlich" : "Privat"}
        />
        <VehicleSettingsSubmenuLink
          href={href("einstellungen/story-pass")}
          icon={Share2}
          iconTone="green"
          title="Story-Karte teilen"
          subtitle={
            topThree != null
              ? `Top ${topThree} der Woche · Story 9:16 & Post 3:4`
              : "Story 9:16 & Post 3:4 für Social"
          }
          isLast
        />
      </IOSGroupedList>

      <IOSGroupedList
        headerTitle="Verkaufen"
        footerText="Exposé mit Historie und Belegen für Interessenten."
      >
        <VehicleSettingsSubmenuLink
          href={href("einstellungen/expose/link")}
          icon={Link2}
          iconTone="purple"
          title="Exposé-Link"
          value={isExposeActive ? "Aktiv" : "Inaktiv"}
        />
        <VehicleSettingsSubmenuLink
          href={href("einstellungen/expose/pdf")}
          icon={FileText}
          iconTone="purple"
          title="Exposé als PDF"
          subtitle="Druckfertig exportieren"
          isLast
        />
      </IOSGroupedList>

      <IOSGroupedList headerTitle="Konto">
        <VehicleSettingsSubmenuLink
          href="/settings"
          tour="konto-security-link"
          icon={ShieldCheck}
          title="Konto & Sicherheit"
          subtitle="2FA, Sitzung und Abmelden"
          isLast
        />
      </IOSGroupedList>
    </div>
  );
}
