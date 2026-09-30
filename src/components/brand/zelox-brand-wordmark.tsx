import { showroom } from "@/components/public-showcase/showroom-styles";
import { cn } from "@/lib/utils";

type ZeloxBrandWordmarkProps = {
  /** Full banner size (dashboard) vs. compact header link. */
  size?: "banner" | "compact";
  className?: string;
};

/** Dashboard / login wordmark — Bebas „ZELOX TAG“ (not the Story PNG). */
export function ZeloxBrandWordmark({
  size = "banner",
  className,
}: ZeloxBrandWordmarkProps) {
  return (
    <span
      className={cn(
        "font-[family-name:var(--font-bebas-neue)] font-normal leading-none",
        size === "banner"
          ? showroom.brandWordmark
          : "text-[1.08rem] tracking-[0.32em] text-[color:var(--vd-text)] sm:text-[1.12rem]",
        className,
      )}
    >
      <span className="sr-only">ZeloxTag</span>
      <span aria-hidden>ZELOX TAG</span>
    </span>
  );
}
