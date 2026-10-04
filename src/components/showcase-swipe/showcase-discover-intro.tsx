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
    <p>
      <Link href={`${profilSettingsHref}#build-swipe`} className={LINK_CLASS}>
        Hier kannst du deinen Build fürs Swipen sichtbar machen
      </Link>
    </p>
  );
}
