import { cn } from "@/lib/utils";

export const SHOWCASE_B2B_PARTNER_URL = "https://zeloxtag.de/pages/b2b";

type ShowcaseB2bPartnerFooterLinkProps = {
  className?: string;
};

/** Workshop partner CTA on public vehicle showcases. */
export function ShowcaseB2bPartnerFooterLink({
  className,
}: ShowcaseB2bPartnerFooterLinkProps) {
  return (
    <p
      className={cn(
        "text-center text-[0.78rem] normal-case leading-relaxed tracking-normal text-white/50",
        className,
      )}
    >
      Dir gehört eine Werkstatt?{" "}
      <a
        href={SHOWCASE_B2B_PARTNER_URL}
        className="font-medium text-white/80 underline underline-offset-2 decoration-white/25 transition-colors hover:text-white hover:decoration-white/50"
      >
        Hier Partner werden!
      </a>
    </p>
  );
}
