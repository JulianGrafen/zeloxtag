import Link from "next/link";

const LINK_CLASS =
  "font-medium text-[color:var(--vd-accent)] underline-offset-2 hover:underline";

type ShowcaseDiscoverIntroProps = {
  profilSettingsHref: string;
  galerieSettingsHref: string;
};

export function ShowcaseDiscoverIntro({
  profilSettingsHref,
  galerieSettingsHref,
}: ShowcaseDiscoverIntroProps) {
  return (
    <div className="space-y-3">
      <p>
        Rechts liken, links passen — nur öffentliche Showcase-Daten, keine Belege
        oder VIN.
      </p>
      <p>
        Sichtbar im Swipe: Unter{" "}
        <Link href={profilSettingsHref} className={LINK_CLASS}>
          Öffentliches Profil
        </Link>{" "}
        „Profil veröffentlichen“ und „Im Build-Swipe zeigen“ aktivieren.
      </p>
      <p>
        Showcase-Fotos kannst du jederzeit nachträglich unter{" "}
        <Link href={galerieSettingsHref} className={LINK_CLASS}>
          Galerie
        </Link>{" "}
        ergänzen.
      </p>
    </div>
  );
}
