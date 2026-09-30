import { Tag } from "lucide-react";

type ShareCardZeloxMarkProps = {
  className?: string;
};

/** Dashboard-style ZeloxTag mark for the 1080px export canvas. */
export function ShareCardZeloxMark({ className }: ShareCardZeloxMarkProps) {
  return (
    <div className={className}>
      <div className="inline-flex items-center gap-5">
        <span
          className="inline-flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-white text-[#0a0a0a] ring-1 ring-white/10"
          aria-hidden
        >
          <Tag className="h-9 w-9" strokeWidth={1.75} />
        </span>
        <span className="font-[family-name:var(--font-display)] text-[44px] font-semibold tracking-[-0.03em] text-white">
          ZeloxTag
        </span>
      </div>
    </div>
  );
}
