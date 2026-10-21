/** Fluid label size for long part names — keeps rows readable without horizontal bleed. */
export function showroomModLabelTypography(label: string): {
  className: string;
  style?: { fontSize: string };
} {
  const len = label.trim().length;
  if (len > 72) {
    return {
      className: "font-medium leading-[1.35] text-white",
      style: { fontSize: "clamp(0.72rem, 3.2vw, 0.8rem)" },
    };
  }
  if (len > 44) {
    return {
      className: "font-medium leading-[1.35] text-white",
      style: { fontSize: "clamp(0.78rem, 3.4vw, 0.86rem)" },
    };
  }
  if (len > 28) {
    return {
      className: "text-[0.88rem] font-medium leading-snug text-white",
    };
  }
  return {
    className: "text-[0.94rem] font-medium leading-snug text-white",
  };
}

export function showroomModVendorTypography(vendor: string): string {
  const len = vendor.trim().length;
  if (len > 24) {
    return "text-[0.62rem] font-medium normal-case tracking-normal text-white/60";
  }
  return "text-[0.62rem] font-medium uppercase tracking-[0.08em] text-white/65";
}
