import { cn } from "@/lib/utils";

import { SHOWCASE_QUARTETT_SEGMENT_COUNT } from "./showcase-quartett-scales";

/** Shared clip — Showroom + Story-Pass use the same parallelogram cut. */
export const SHOWCASE_QUARTETT_SEGMENT_CLIP =
  "[clip-path:polygon(16%_0,100%_0,84%_100%,0_100%)]";

/** Showroom spec rows (~400px content width). */
export const SHOWROOM_QUARTETT_SEGMENT_CLASS = cn(
  "h-[10px] min-w-0 flex-1 origin-left",
  SHOWCASE_QUARTETT_SEGMENT_CLIP,
);

/**
 * Story card at 1080px width — taller segments so slant stays visible
 * in the scaled settings preview (same visual weight as Showroom).
 */
export const SHARE_CARD_QUARTETT_SEGMENT_CLASS = cn(
  "h-[28px] min-w-0 flex-1 origin-left",
  SHOWCASE_QUARTETT_SEGMENT_CLIP,
);

type ShowcaseQuartettSegmentBarProps = {
  filled: number;
  total?: number;
  className?: string;
  segmentClassName?: string;
};

export function ShowcaseQuartettSegmentBar({
  filled,
  total = SHOWCASE_QUARTETT_SEGMENT_COUNT,
  className,
  segmentClassName = SHOWROOM_QUARTETT_SEGMENT_CLASS,
}: ShowcaseQuartettSegmentBarProps) {
  const clampedFilled = Math.min(total, Math.max(0, filled));

  return (
    <div
      className={cn("flex w-full gap-[3px] px-0.5", className)}
      role="img"
      aria-hidden
    >
      {Array.from({ length: total }, (_, index) => {
        const isActive = index < clampedFilled;
        return (
          <div
            key={index}
            className={cn(
              segmentClassName,
              isActive ? "bg-white" : "bg-white/12",
            )}
          />
        );
      })}
    </div>
  );
}
