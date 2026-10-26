import { Fuel, Landmark, Receipt, ShieldCheck, type LucideIcon } from "lucide-react";

import type { IconBadgeTone } from "@/components/ui/ios";
import type { OperatingCostCategory } from "@/lib/vehicles/operating-costs/types";

export const OPERATING_COST_CATEGORY_ICONS: Record<OperatingCostCategory, LucideIcon> = {
  fuel: Fuel,
  insurance: ShieldCheck,
  tax: Landmark,
  other: Receipt,
};

export const OPERATING_COST_CATEGORY_TONES: Record<OperatingCostCategory, IconBadgeTone> = {
  fuel: "green",
  insurance: "blue",
  tax: "purple",
  other: "amber",
};
