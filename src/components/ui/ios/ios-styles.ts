/** Apple OLED dark tokens — single source for inset-grouped surfaces. */

export const IOS_COLORS = {
  background: "#000000",
  surface: "#1C1C1E",
  surfaceElevated: "#2C2C2E",
  labelSecondary: "#8E8E93",
  labelTertiary: "#48484A",
} as const;

export const IOS_CARD =
  "rounded-2xl border border-white/[0.07] bg-[#1C1C1E] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]";

export const IOS_SECTION_HEADER =
  "px-4 pb-1.5 text-xs font-medium uppercase tracking-wider text-[#8E8E93]";

export const IOS_SECTION_FOOTER = "px-4 pt-1.5 text-xs leading-snug text-[#8E8E93]";

export const IOS_TEXT = {
  primary: "text-white",
  secondary: "text-[#8E8E93]",
  tertiary: "text-[#48484A]",
} as const;

export const IOS_ROW_PRESSED = "transition-colors duration-75 active:bg-[#2C2C2E]";

export const IOS_PILL =
  "inline-flex items-center gap-1 rounded-full bg-white/[0.08] px-2.5 py-1 text-xs font-medium text-[#EBEBF5]";

/** Hairline under a row; hidden on the last row of a group. Pair with an inset class. */
export const IOS_ROW_SEPARATOR =
  "after:pointer-events-none after:absolute after:bottom-0 after:right-0 after:h-px after:bg-white/[0.08] last:after:hidden";

/** Separator starts under the text when the row has an IconBadge (12px pad + 28px badge + 8px gap). */
export const IOS_ROW_SEPARATOR_INSET_ICON = "after:left-12";

export const IOS_ROW_SEPARATOR_INSET_TEXT = "after:left-4";

const IOS_CHIP_BASE =
  "inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full px-3.5 text-[13px] font-semibold transition-colors";

export const IOS_CHIP_ACTIVE = `${IOS_CHIP_BASE} bg-white text-black`;

export const IOS_CHIP_INACTIVE = `${IOS_CHIP_BASE} border border-white/[0.07] bg-[#1C1C1E] text-[#8E8E93] active:bg-[#2C2C2E]`;

export const IOS_LINK = "text-[#0A84FF]";
