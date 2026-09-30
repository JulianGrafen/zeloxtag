import { InstagramGlyph } from "@/components/public-showcase/InstagramGlyph";
import { instagramHandleLabel } from "@/lib/vehicles/instagram-handle";

type ShareCardInstagramHandleProps = {
  handle: string;
  compact?: boolean;
};

/** Matches public showroom hero meta (glyph + @handle). */
export function ShareCardInstagramHandle({
  handle,
  compact = false,
}: ShareCardInstagramHandleProps) {
  const textClass = compact
    ? "text-[26px] leading-snug"
    : "text-[30px] leading-snug";

  return (
    <div
      className={`flex w-full items-start gap-3 font-medium text-white/70 ${textClass}`}
    >
      <InstagramGlyph
        className={`mt-0.5 shrink-0 text-white/55 ${compact ? "h-7 w-7" : "h-8 w-8"}`}
      />
      <span className="min-w-0 flex-1 break-words">
        {instagramHandleLabel(handle)}
      </span>
    </div>
  );
}
