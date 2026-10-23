import { ShareCardZeloxMark } from "./ShareCardZeloxMark";

type ShareCardStoryFooterMarkProps = {
  heightPx?: number;
};

/** Centered black tile — weekly rank Story mockup footer. */
export function ShareCardStoryFooterMark({
  heightPx = 96,
}: ShareCardStoryFooterMarkProps) {
  return (
    <div
      className="inline-flex items-center justify-center rounded-2xl bg-black px-8 py-4 shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
    >
      <ShareCardZeloxMark heightPx={heightPx} />
    </div>
  );
}
