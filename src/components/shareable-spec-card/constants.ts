import {
  SHOWCASE_QUARTETT_POWER_PS_MAX,
  SHOWCASE_QUARTETT_TORQUE_NM_MAX,
} from "@/components/public-showcase/showcase-quartett-scales";
import { ZELOX_BRAND_MARK_SRC } from "@/lib/brand/constants";

/** Story card export dimensions (9:16, Instagram Story native). */
export const SHAREABLE_SPEC_CARD_WIDTH_PX = 1080;
export const SHAREABLE_SPEC_CARD_HEIGHT_PX = 1920;

/** 1× = 1080×1920 output; matches Instagram Story resolution. */
export const SHAREABLE_SPEC_CARD_EXPORT_PIXEL_RATIO = 1;

/** Footer wordmark — same asset as app chrome. */
export const SHARE_CARD_ZELOX_MARK_SRC = ZELOX_BRAND_MARK_SRC;

/** Bar scale ceilings aligned with public showcase Quartett cards. */
export const SHAREABLE_SPEC_POWER_MAX_PS = SHOWCASE_QUARTETT_POWER_PS_MAX;
export const SHAREABLE_SPEC_TORQUE_MAX_NM = SHOWCASE_QUARTETT_TORQUE_NM_MAX;

/** Lower kg/PS is better; bar fills inversely toward this floor. */
export const SHAREABLE_SPEC_POWER_TO_WEIGHT_MAX_KG_PS = 12;
export const SHAREABLE_SPEC_POWER_TO_WEIGHT_MIN_KG_PS = 3;
