import Link from "next/link";

const LINK_CLASS =
  "font-medium text-[color:var(--vd-accent)] underline-offset-2 hover:underline";

type ShowcaseDiscoverIntroProps = {
  profilSettingsHref: string;
};

export function ShowcaseDiscoverIntro({
  profilSettingsHref,
}: ShowcaseDiscoverIntroProps) {
  return (
    <div className="space-y-3">
      <p>
        Sichtbar im Swipe: Unter{" "}
        <Link href={profilSettingsHref} className={LINK_CLASS}>
          Öffentliches Profil
        </Link>{" "}
        <Link
          href={`${profilSettingsHref}#profil-veroeffentlichen`}
          className={LINK_CLASS}
        >
          „Profil veröffentlichen“
        </Link>{" "}
        und{" "}
        <Link href={`${profilSettingsHref}#build-swipe`} className={LINK_CLASS}>
          „Im Build-Swipe zeigen“
        </Link>{" "}
        aktivieren.
      </p>
    </div>
  );
}
