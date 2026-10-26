"use client";

import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { createContext, useContext, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { IconBadge, type IconBadgeTone } from "./IconBadge";
import {
  IOS_ROW_PRESSED,
  IOS_ROW_SEPARATOR,
  IOS_ROW_SEPARATOR_INSET_ICON,
  IOS_ROW_SEPARATOR_INSET_TEXT,
} from "./ios-styles";
import { useIosHaptics } from "./use-ios-haptics";

/**
 * `data`: grey label, white value (receipts, specs).
 * `navigation`: white label, grey value (settings rows).
 * `item`: white title, white value (list entries such as Belege or Tankstopps).
 */
export type InsetListRowEmphasis = "data" | "navigation" | "item";

export type InsetListRowValueVariant = "text" | "numeric" | "mono";

/**
 * `inline`: label left, value right (iOS settings).
 * `stacked`: uppercase kicker above a bold value, plain glyph instead of a tinted badge.
 */
export type InsetListRowLayout = "inline" | "stacked";

const InsetListRowLayoutContext = createContext<InsetListRowLayout>("inline");

/** Sets the layout for every row in a group, including rows rendered by nested editors. */
export function InsetListRowLayoutProvider({
  layout,
  children,
}: {
  layout: InsetListRowLayout;
  children: ReactNode;
}) {
  return (
    <InsetListRowLayoutContext.Provider value={layout}>
      {children}
    </InsetListRowLayoutContext.Provider>
  );
}

export type InsetListRowProps = {
  label: ReactNode;
  sublabel?: ReactNode;
  value?: ReactNode;
  valueVariant?: InsetListRowValueVariant;
  emphasis?: InsetListRowEmphasis;
  /** Overrides the layout inherited from `InsetListRowLayoutProvider`. */
  layout?: InsetListRowLayout;
  icon?: LucideIcon;
  iconTone?: IconBadgeTone;
  /** Custom leading node rendered inside a neutral badge frame. */
  leading?: ReactNode;
  trailing?: ReactNode;
  href?: string;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  /** Hides the row's own separator — use when a wrapping `<li>` draws it instead. */
  isLast?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
};

const VALUE_VARIANT_CLASS: Record<InsetListRowValueVariant, string> = {
  text: "",
  numeric: "tabular-nums",
  mono: "font-mono text-xs text-zinc-300 tabular-nums",
};

function rowClassName({
  hasLeading,
  stacked,
  isLast,
  interactive,
  disabled,
  className,
}: {
  hasLeading: boolean;
  stacked: boolean;
  isLast: boolean;
  interactive: boolean;
  disabled: boolean;
  className?: string;
}): string {
  return cn(
    "ios-ui relative flex min-h-[44px] w-full items-center pr-4 text-left",
    stacked ? "py-3.5" : "py-2.5",
    hasLeading ? "gap-2 pl-3" : "gap-3 pl-4",
    IOS_ROW_SEPARATOR,
    hasLeading ? IOS_ROW_SEPARATOR_INSET_ICON : IOS_ROW_SEPARATOR_INSET_TEXT,
    isLast && "after:hidden",
    interactive && IOS_ROW_PRESSED,
    disabled && "pointer-events-none opacity-50",
    className,
  );
}

function RowLeading({
  icon: Icon,
  iconTone,
  leading,
  layout,
}: Pick<InsetListRowProps, "icon" | "iconTone" | "leading"> & {
  layout: InsetListRowLayout;
}) {
  if (Icon && layout === "stacked") {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center self-start pt-1">
        <Icon className="h-[18px] w-[18px] text-[#8E8E93]" strokeWidth={1.75} aria-hidden />
      </span>
    );
  }
  if (Icon) return <IconBadge icon={Icon} tone={iconTone} />;
  if (leading) {
    return (
      <IconBadge tone={iconTone} className="bg-white/10 text-white">
        {leading}
      </IconBadge>
    );
  }
  return null;
}

function RowText({
  label,
  sublabel,
  emphasis,
  destructive,
}: Pick<InsetListRowProps, "label" | "sublabel" | "destructive"> & {
  emphasis: InsetListRowEmphasis;
}) {
  const labelTone = destructive
    ? "text-[#FF453A]"
    : emphasis === "data"
      ? "text-[#8E8E93]"
      : "text-white";
  const isItem = emphasis === "item";

  return (
    <span className={cn("flex-1 pr-3", emphasis !== "data" && "min-w-0")}>
      <span
        className={cn(
          "block text-[15px] leading-snug",
          labelTone,
          isItem && "line-clamp-2 font-medium",
        )}
      >
        {label}
      </span>
      {sublabel ? (
        <span
          className={cn(
            "mt-0.5 block text-xs leading-snug text-[#8E8E93]",
            isItem && "tabular-nums",
          )}
        >
          {sublabel}
        </span>
      ) : null}
    </span>
  );
}

function StackedRowText({
  label,
  value,
  valueVariant,
}: {
  label: ReactNode;
  value?: ReactNode;
  valueVariant: InsetListRowValueVariant;
}) {
  return (
    <span className="min-w-0 flex-1 pr-2">
      <span className="block font-[family-name:var(--font-display)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8E8E93]">
        {label}
      </span>
      {value != null ? (
        <span
          className={cn(
            "mt-1 block text-[15px] font-semibold leading-snug tracking-[-0.01em] text-white [overflow-wrap:anywhere]",
            VALUE_VARIANT_CLASS[valueVariant],
          )}
        >
          {value}
        </span>
      ) : null}
    </span>
  );
}

function RowValue({
  value,
  valueVariant,
  emphasis,
  chevron,
}: {
  value?: ReactNode;
  valueVariant: InsetListRowValueVariant;
  emphasis: InsetListRowEmphasis;
  chevron: boolean;
}) {
  if (value == null && !chevron) return null;
  return (
    <span
      className={cn(
        "flex max-w-[62%] items-center justify-end gap-1.5",
        emphasis === "data" ? "min-w-0" : "shrink-0",
      )}
    >
      {value != null ? (
        <span
          className={cn(
            "min-w-0 truncate text-right text-[15px]",
            emphasis === "navigation"
              ? "text-[#8E8E93]"
              : "font-medium text-white",
            VALUE_VARIANT_CLASS[valueVariant],
          )}
        >
          {value}
        </span>
      ) : null}
      {chevron ? (
        <ChevronRight
          className="h-4 w-4 shrink-0 text-[#48484A]"
          strokeWidth={2}
          aria-hidden
        />
      ) : null}
    </span>
  );
}

export function InsetListRow({
  label,
  sublabel,
  value,
  valueVariant = "text",
  emphasis = "data",
  layout: layoutProp,
  icon,
  iconTone,
  leading,
  trailing,
  href,
  onPress,
  chevron,
  destructive = false,
  isLast = false,
  disabled = false,
  className,
  id,
}: InsetListRowProps) {
  const { hapticLight } = useIosHaptics();
  const inheritedLayout = useContext(InsetListRowLayoutContext);
  const layout = layoutProp ?? inheritedLayout;
  const stacked = layout === "stacked";
  const showChevron = chevron ?? (Boolean(href) && !trailing);
  const hasLeading = Boolean(icon || leading);
  const interactive = Boolean((href || onPress) && !disabled);
  const rowClass = rowClassName({
    hasLeading,
    stacked,
    isLast,
    interactive,
    disabled,
    className,
  });

  const leadingNode = (
    <RowLeading
      icon={icon}
      iconTone={iconTone}
      leading={leading}
      layout={layout}
    />
  );
  const textNode = stacked ? (
    <StackedRowText label={label} value={value} valueVariant={valueVariant} />
  ) : (
    <RowText
      label={label}
      sublabel={sublabel}
      emphasis={emphasis}
      destructive={destructive}
    />
  );
  const valueNode =
    trailing ??
    (stacked ? (
      showChevron ? (
        <ChevronRight
          className="h-4 w-4 shrink-0 text-[#48484A]"
          strokeWidth={2}
          aria-hidden
        />
      ) : null
    ) : (
      <RowValue
        value={value}
        valueVariant={valueVariant}
        emphasis={emphasis}
        chevron={showChevron}
      />
    ));

  function handlePress() {
    if (disabled || !onPress) return;
    hapticLight();
    onPress();
  }

  if (href && !disabled) {
    return (
      <Link
        id={id}
        href={href}
        data-ios-ui
        className={rowClass}
        onClick={() => hapticLight()}
      >
        {leadingNode}
        {textNode}
        {valueNode}
      </Link>
    );
  }

  if (onPress && !trailing) {
    return (
      <button
        id={id}
        type="button"
        data-ios-ui
        className={rowClass}
        disabled={disabled}
        onClick={handlePress}
      >
        {leadingNode}
        {textNode}
        {valueNode}
      </button>
    );
  }

  if (onPress) {
    return (
      <div id={id} data-ios-ui className={rowClass}>
        <button
          type="button"
          className={cn(
            "flex min-w-0 flex-1 items-center text-left",
            hasLeading ? "gap-2" : "gap-3",
          )}
          disabled={disabled}
          onClick={handlePress}
        >
          {leadingNode}
          {textNode}
        </button>
        {trailing}
      </div>
    );
  }

  return (
    <div id={id} data-ios-ui className={rowClass}>
      {leadingNode}
      {textNode}
      {valueNode}
    </div>
  );
}
