import Link from "next/link";

const LINK_CLASS =
  "font-medium text-[color:var(--vd-text)] underline decoration-[color:var(--vd-border)] underline-offset-4 hover:decoration-[color:var(--vd-muted)]";

type ShowcaseDiscoverIntroProps = {
  profilSettingsHref: string;
};

export function ShowcaseDiscoverIntro({
  profilSettingsHref,
}: ShowcaseDiscoverIntroProps) {
  return (
    <p className="text-[0.88rem] leading-relaxed text-[color:var(--vd-muted)]">
      Like öffentliche Builds und entdecke Umbauten aus der Community.{" "}
      <Link href={`${profilSettingsHref}#build-swipe`} className={LINK_CLASS}>
        Eigenen Build sichtbar machen
      </Link>
    </p>
  );
}
