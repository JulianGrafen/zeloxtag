import { SHARE_CARD_ZELOX_MARK_SRC } from "./constants";

type ShareCardZeloxMarkProps = {
  className?: string;
  heightPx?: number;
};

/** ZeloxTag wordmark for the 1080×1920 Story export footer (bottom-left). */
export function ShareCardZeloxMark({
  className,
  heightPx = 152,
}: ShareCardZeloxMarkProps) {
  return (
    <div className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element -- DOM export (html-to-image) needs native img */}
      <img
        src={SHARE_CARD_ZELOX_MARK_SRC}
        alt="ZeloxTag — Dein Auto. Deine Story."
        className="block w-auto max-w-[min(560px,92vw)] object-contain object-left"
        style={{ height: heightPx }}
        decoding="sync"
      />
    </div>
  );
}
