"use client";

import { PencilLine } from "lucide-react";

import { InsetGroupedCard, InsetListRow } from "@/components/ui/ios";

type FuelLogActionsProps = {
  manualHref: string;
};

export function FuelLogActions({ manualHref }: FuelLogActionsProps) {
  return (
    <InsetGroupedCard>
      <InsetListRow
        href={manualHref}
        icon={PencilLine}
        iconTone="green"
        emphasis="navigation"
        label="Manuell eintragen"
      />
    </InsetGroupedCard>
  );
}
