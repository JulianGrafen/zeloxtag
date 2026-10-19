import {
  automotiveCardClassName,
  automotiveCardTitleClassName,
  automotiveMetaClassName,
} from "@/components/ui/automotive";
import { cn } from "@/lib/utils";

/** Standalone settings row — automotive material surface in dark. */
export const SETTINGS_SUBMENU_TILE_CLASS = cn(
  automotiveCardClassName,
  "flex items-center justify-between gap-3 px-4 py-3.5 transition-[border-color,box-shadow] duration-200 hover:border-white/10 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]",
);

export const SETTINGS_SUBMENU_GROUP_ROW_CLASS =
  "flex items-center justify-between gap-3 px-4 py-3.5 text-zinc-100 transition-colors hover:bg-white/[0.03] active:bg-white/[0.05]";

export { automotiveCardTitleClassName, automotiveMetaClassName };
