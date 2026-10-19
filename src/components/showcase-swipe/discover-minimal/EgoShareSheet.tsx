"use client";

import { ShareCardComposer } from "@/components/shareable-spec-card/ShareCardComposer";
import type { ShareableBuildData } from "@/components/shareable-spec-card/types";

import { DiscoverBottomSheet } from "./DiscoverBottomSheet";

type EgoShareSheetProps = {
  open: boolean;
  onClose: () => void;
  cardData: ShareableBuildData;
  vehicleId?: string;
};

export function EgoShareSheet({
  open,
  onClose,
  cardData,
  vehicleId,
}: EgoShareSheetProps) {
  return (
    <DiscoverBottomSheet open={open} onClose={onClose} title="Rang teilen">
      <ShareCardComposer
        data={cardData}
        vehicleId={vehicleId}
        defaultFormat="story"
        defaultStyle="rankHero"
        previewMaxWidth={280}
        persistVariant={false}
        className="pb-6"
      />
    </DiscoverBottomSheet>
  );
}
