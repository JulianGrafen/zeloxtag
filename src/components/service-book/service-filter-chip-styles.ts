import { IOS_CHIP_ACTIVE, IOS_CHIP_INACTIVE } from "@/components/ui/ios";

/** Category chips inside the service form modal (list chips use `IOSFilterChips`). */
export function serviceFilterChipFormClassName(active: boolean): string {
  return active ? IOS_CHIP_ACTIVE : IOS_CHIP_INACTIVE;
}
