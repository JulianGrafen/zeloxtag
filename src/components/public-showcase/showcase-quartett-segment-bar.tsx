import { cn } from "@/lib/utils";

import { SHOWCASE_QUARTETT_SEGMENT_COUNT } from "./showcase-quartett-scales";

/** Slanted Quartett-style parallelogram per segment (static, export-safe). */
const defaultSegmentShape =
  "h-[10px] min-w-0 flex-1 origin-left [clip-path:polygon(16%_0,100%_0,84%_100%,0_100%)]";

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
  segmentClassName = defaultSegmentShape,
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

/** Taller segments for 1080px share-card export canvas. */
export const SHARE_CARD_QUARTETT_SEGMENT_CLASS =
  "h-[16px] min-w-0 flex-1 origin-left [clip-path:polygon(16%_0,100%_0,84%_100%,0_100%)]";
