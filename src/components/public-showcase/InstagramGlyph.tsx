type InstagramGlyphProps = {
  className?: string;
};

/** Official Instagram camera glyph — color via `currentColor`. */
export function InstagramGlyph({ className }: InstagramGlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <rect
        x="2.4"
        y="2.4"
        width="19.2"
        height="19.2"
        rx="5.4"
        stroke="currentColor"
        strokeWidth="1.9"
      />
      <circle
        cx="12"
        cy="12"
        r="4.35"
        stroke="currentColor"
        strokeWidth="1.9"
      />
      <circle cx="17.35" cy="6.65" r="1.2" fill="currentColor" />
    </svg>
  );
}
