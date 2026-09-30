import { InstagramGlyph } from "@/components/public-showcase/InstagramGlyph";
import { instagramHandleLabel } from "@/lib/vehicles/instagram-handle";

type ShareCardInstagramHandleProps = {
  handle: string;
  compact?: boolean;
  /** On the hero gradient under the model name (same placement as ShowroomHero). */
  variant?: "hero" | "inline";
};

/** Matches public showroom hero meta (glyph + @handle). */
export function ShareCardInstagramHandle({
  handle,
  compact = false,
  variant = "inline",
}: ShareCardInstagramHandleProps) {
  const isHero = variant === "hero";
  const textClass = isHero
    ? compact
      ? "text-[36px] leading-snug"
      : "text-[40px] leading-snug"
    : compact
      ? "text-[34px] leading-snug"
      : "text-[38px] leading-snug";

  return (
    <div
      data-share-instagram-handle=""
      className={`flex w-full items-start gap-3 font-medium text-white/75 ${textClass} ${
        isHero ? "mt-4" : ""
      }`}
    >
      <InstagramGlyph
        className={`mt-0.5 shrink-0 text-white/60 ${compact ? "h-9 w-9" : "h-10 w-10"}`}
      />
      <span className="min-w-0 flex-1 break-words">
        {instagramHandleLabel(handle)}
      </span>
    </div>
  );
}
