"use client";

import { ShareableSpecCardExportButton } from "./ShareableSpecCardExportButton";

type ShareBuildToStoryButtonProps = {
  onShare: () => void;
  isSharing: boolean;
  disabled?: boolean;
  error?: string | null;
  className?: string;
  hint?: string | null;
  label?: string;
  pendingLabel?: string;
};

export function ShareBuildToStoryButton({
  onShare,
  isSharing,
  disabled = false,
  error,
  className,
  hint,
  label = "Share Build to Story",
  pendingLabel = "Story wird erstellt…",
}: ShareBuildToStoryButtonProps) {
  return (
    <ShareableSpecCardExportButton
      onExport={onShare}
      isExporting={isSharing}
      disabled={disabled}
      error={error}
      className={className}
      label={label}
      pendingLabel={pendingLabel}
      hint={hint}
    />
  );
}
