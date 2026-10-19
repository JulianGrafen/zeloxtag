"use client";

import type { ShareCardFormat, ShareCardStyle } from "@/lib/share/share-card-variant";

import { ShareCardComposer } from "./ShareCardComposer";
import type { ShareableBuildData } from "./types";

type ShareableSpecCardProps = {
  data: ShareableBuildData;
  /** When set, story export uses server OG PNG (no client canvas). */
  vehicleId?: string;
  className?: string;
  previewMaxWidth?: number;
  showExportButton?: boolean;
  exportButtonLabel?: string;
  exportButtonPendingLabel?: string;
  exportHint?: string | null;
  defaultFormat?: ShareCardFormat;
  defaultStyle?: ShareCardStyle;
  persistVariant?: boolean;
};

export function ShareableSpecCard(props: ShareableSpecCardProps) {
  return <ShareCardComposer {...props} />;
}
