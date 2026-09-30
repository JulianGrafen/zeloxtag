import { InstagramGlyph } from "@/components/public-showcase/InstagramGlyph";
import { instagramHandleLabel } from "@/lib/vehicles/instagram-handle";

type ShareCardInstagramHandleProps = {
  handle: string;
};

/** Matches public showroom hero meta (glyph + @handle). */
export function ShareCardInstagramHandle({ handle }: ShareCardInstagramHandleProps) {
  return (
    <p className="mt-5 inline-flex max-w-full items-center gap-3 text-[32px] font-medium leading-none text-white/70">
      <InstagramGlyph className="h-8 w-8 shrink-0 text-white/55" />
      <span className="truncate">{instagramHandleLabel(handle)}</span>
    </p>
  );
}
