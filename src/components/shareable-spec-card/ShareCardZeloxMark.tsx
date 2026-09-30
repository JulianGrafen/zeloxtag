import { SHARE_CARD_ZELOX_MARK_SRC } from "./constants";

type ShareCardZeloxMarkProps = {
  className?: string;
};

/** ZeloxTag wordmark for the 1080×1920 Story export footer (bottom-left). */
export function ShareCardZeloxMark({ className }: ShareCardZeloxMarkProps) {
  return (
    <div className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element -- DOM export (html-to-image) needs native img */}
      <img
        src={SHARE_CARD_ZELOX_MARK_SRC}
        alt="ZeloxTag — Dein Auto. Deine Story."
        className="block h-[128px] w-auto max-w-[400px] object-contain object-left"
        decoding="sync"
      />
    </div>
  );
}
