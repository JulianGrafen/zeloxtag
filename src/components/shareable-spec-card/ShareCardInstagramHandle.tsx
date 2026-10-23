import { InstagramGlyph } from "@/components/public-showcase/InstagramGlyph";
import { instagramHandleLabel } from "@/lib/vehicles/instagram-handle";

type ShareCardInstagramHandleProps = {
  handle: string;
  compact?: boolean;
  /** Tighter gap under model name (weekly rank Story). */
  tight?: boolean;
  /** On the hero gradient under the model name (same placement as ShowroomHero). */
  variant?: "hero" | "inline";
};

/** Matches public showroom hero meta (glyph + @handle). */
export function ShareCardInstagramHandle({
  handle,
  compact = false,
  tight = false,
  variant = "inline",
}: ShareCardInstagramHandleProps) {
  const isHero = variant === "hero";
  const textClass = isHero
    ? compact
      ? "text-[32px] leading-snug"
      : tight
        ? "text-[34px] leading-snug"
        : "text-[40px] leading-snug"
    : compact
      ? "text-[34px] leading-snug"
      : "text-[38px] leading-snug";

  const heroMargin = tight ? "mt-1.5" : "mt-4";

  return (
    <div
      data-share-instagram-handle=""
      className={`flex w-full items-start gap-2.5 font-medium text-white/80 ${textClass} ${
        isHero ? heroMargin : ""
      }`}
    >
      <InstagramGlyph
        className={`mt-0.5 shrink-0 text-white/65 ${compact || tight ? "h-8 w-8" : "h-10 w-10"}`}
      />
      <span className="min-w-0 flex-1 break-words">
        {instagramHandleLabel(handle)}
      </span>
    </div>
  );
}
