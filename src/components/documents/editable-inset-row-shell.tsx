"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import {
  InsetListRow,
  type IconBadgeTone,
  type InsetListRowValueVariant,
} from "@/components/ui/ios";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import { cn } from "@/lib/utils";

/** `default` keeps the legacy stacked layout; `inset-row` renders an iOS list row. */
export type EditableSectionLayout = "default" | "inset-row";

type EditableInsetRowShellProps = {
  sectionId?: string;
  label: string;
  icon: LucideIcon;
  iconTone?: IconBadgeTone;
  value: ReactNode;
  valueVariant?: InsetListRowValueVariant;
  editing: boolean;
  editor: ReactNode;
  pending: boolean;
  error: string | null;
  onEdit?: () => void;
  onSave: () => void;
  onCancel: () => void;
};

/**
 * Shared read/edit frame for document fields inside an `InsetGroupedCard`.
 * Read: horizontal label/value row. Edit: field + Speichern/Abbrechen in place.
 */
export function EditableInsetRowShell({
  sectionId,
  label,
  icon,
  iconTone,
  value,
  valueVariant = "text",
  editing,
  editor,
  pending,
  error,
  onEdit,
  onSave,
  onCancel,
}: EditableInsetRowShellProps) {
  if (!editing) {
    return (
      <InsetListRow
        id={sectionId}
        className="scroll-mt-24"
        icon={icon}
        iconTone={iconTone}
        label={label}
        value={value}
        valueVariant={valueVariant}
        onPress={onEdit}
        chevron={false}
      />
    );
  }

  return (
    <div
      id={sectionId}
      className="relative scroll-mt-24 space-y-3 px-4 py-3 after:absolute after:bottom-0 after:left-4 after:right-0 after:h-px after:bg-white/[0.08] last:after:hidden"
    >
      <p className="text-xs font-medium uppercase tracking-wider text-[#8E8E93]">
        {label}
      </p>
      {editor}
      <div className="flex gap-2">
        <InsetEditorButton tone="primary" disabled={pending} onClick={onSave}>
          {pending ? "Speichern…" : "Speichern"}
        </InsetEditorButton>
        <InsetEditorButton tone="secondary" disabled={pending} onClick={onCancel}>
          Abbrechen
        </InsetEditorButton>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-[#FF453A]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function InsetEditorButton({
  tone,
  disabled,
  onClick,
  children,
}: {
  tone: "primary" | "secondary";
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <PressableButton
      type="button"
      variant="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex flex-1 items-center justify-center rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50",
        tone === "primary"
          ? "bg-white text-black"
          : "bg-white/[0.08] text-white",
      )}
    >
      {children}
    </PressableButton>
  );
}
