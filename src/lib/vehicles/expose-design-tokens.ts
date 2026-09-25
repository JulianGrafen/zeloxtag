/** Shared visual constants for web exposé + @react-pdf renderer. */

export const exposeColors = {
  page: "#f4f1ea",
  card: "#ffffff",
  text: "#18181b",
  textMuted: "#71717a",
  border: "#e4e4e7",
  accent: "#09090b",
  tableHeader: "#18181b",
  tableZebra: "#fafaf9",
  trustBg: "#ecfdf5",
  trustBorder: "#a7f3d0",
  trustText: "#065f46",
  trustTextStrong: "#064e3b",
} as const;

export const exposePdfFontFamilies = {
  display: "ExposePoppins",
  displayBold: "ExposePoppins-Bold",
  body: "ExposeInter",
  bodyMedium: "ExposeInter-Medium",
} as const;

export const exposeTypography = {
  eyebrowSize: 6.8,
  eyebrowTracking: 1.4,
  sectionLabelSize: 8,
  bodySize: 9,
  tableSize: 7.5,
  displayTitleSize: 24,
  coverSubtitleSize: 10,
} as const;
