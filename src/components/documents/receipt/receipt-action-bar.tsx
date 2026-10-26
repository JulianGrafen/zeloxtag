"use client";

import { FileText, Pencil, Share2, type LucideIcon } from "lucide-react";

import { FixedBottomActionBar } from "@/components/vehicle-dashboard/fixed-bottom-action-bar";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import { cn } from "@/lib/utils";

type ReceiptActionBarProps = {
  /** Opens the original file; hidden when there is nothing viewable. */
  originalHref?: string | null;
  originalLabel?: string;
  onShare: () => void;
  onEdit?: () => void;
};

const ICON_BUTTON_CLASS =
  "inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl bg-white/[0.08] text-white active:scale-[0.97] transition";

const PRIMARY_BUTTON_CLASS =
  "flex h-[52px] min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-white px-3 text-[15px] font-semibold text-black transition active:scale-[0.99]";

const SECONDARY_BUTTON_CLASS =
  "flex h-[52px] min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-white/[0.08] px-3 text-[15px] font-semibold text-white transition active:scale-[0.99]";

function ActionIconButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <PressableButton
      type="button"
      variant="button"
      aria-label={label}
      onClick={onClick}
      className={ICON_BUTTON_CLASS}
    >
      <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
    </PressableButton>
  );
}

export function ReceiptActionBar({
  originalHref,
  originalLabel = "Original-PDF öffnen",
  onShare,
  onEdit,
}: ReceiptActionBarProps) {
  const showPdf = Boolean(originalHref);
  const showEdit = Boolean(onEdit);

  return (
    <FixedBottomActionBar variant="ios" portal>
      <div className="flex flex-col gap-2" data-tour="receipt-action-bar">
        {showPdf ? (
          <a
            href={originalHref!}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(PRIMARY_BUTTON_CLASS, "w-full")}
          >
            <FileText className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
            <span className="truncate">{originalLabel}</span>
          </a>
        ) : null}

        <div
          className={cn(
            "flex items-center gap-2",
            showPdf && !showEdit && "justify-end",
          )}
        >
          {showEdit ? (
            <PressableButton
              type="button"
              variant="button"
              onClick={onEdit}
              className={cn(PRIMARY_BUTTON_CLASS, "min-w-0 flex-1")}
            >
              <Pencil className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
              Bearbeiten
            </PressableButton>
          ) : null}

          {showPdf && !showEdit ? (
            <ActionIconButton icon={Share2} label="Teilen" onClick={onShare} />
          ) : (
            <PressableButton
              type="button"
              variant="button"
              onClick={onShare}
              className={cn(
                showEdit ? SECONDARY_BUTTON_CLASS : cn(PRIMARY_BUTTON_CLASS, "w-full"),
              )}
            >
              <Share2 className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
              Teilen
            </PressableButton>
          )}
        </div>
      </div>
    </FixedBottomActionBar>
  );
}
