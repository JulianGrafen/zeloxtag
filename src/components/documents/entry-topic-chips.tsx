"use client";

import {
  ENTRY_TOPIC_TAGS,
  ENTRY_TOPIC_TAG_LABELS,
  type EntryTopicTag,
} from "@/lib/documents/entry-topic-tags";

type EntryTopicChipsProps = {
  value: readonly EntryTopicTag[];
  onChange: (tags: EntryTopicTag[]) => void;
  disabled?: boolean;
  className?: string;
  /** Smaller tap targets for dense review UI. */
  compact?: boolean;
};

export function EntryTopicChips({
  value,
  onChange,
  disabled = false,
  className = "",
  compact = false,
}: EntryTopicChipsProps) {
  const selected = new Set(value);
  const chipSizeClass = compact
    ? "rounded-full px-2.5 py-1 text-[0.72rem] font-medium"
    : "rounded-full px-3.5 py-2 text-[0.82rem] font-medium";

  function toggle(tag: EntryTopicTag) {
    if (disabled) return;
    if (selected.has(tag)) {
      onChange(value.filter((item) => item !== tag));
      return;
    }
    if (value.length >= 5) return;
    onChange([...value, tag]);
  }

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`.trim()}>
      {ENTRY_TOPIC_TAGS.map((tag) => {
        const active = selected.has(tag);
        return (
          <button
            key={tag}
            type="button"
            disabled={disabled}
            onClick={() => toggle(tag)}
            className={[
              chipSizeClass,
              "transition-colors disabled:opacity-50",
              active
                ? "bg-neutral-900 text-white"
                : "border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-text)]",
            ].join(" ")}
            aria-pressed={active}
          >
            {active ? "✓ " : ""}
            {ENTRY_TOPIC_TAG_LABELS[tag]}
          </button>
        );
      })}
    </div>
  );
}

type EntryTopicTagsReadonlyProps = {
  tags: readonly EntryTopicTag[];
  className?: string;
};

/** Compact pills for scan review — only recognized tags, no full picker. */
export function EntryTopicTagsReadonly({
  tags,
  className = "",
}: EntryTopicTagsReadonlyProps) {
  if (tags.length === 0) {
    return (
      <span className="text-[0.75rem] text-[color:var(--vd-muted)]">
        Keine erkannt
      </span>
    );
  }

  return (
    <span className={`inline-flex flex-wrap justify-end gap-1 ${className}`.trim()}>
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full bg-neutral-900 px-2 py-0.5 text-[0.68rem] font-medium text-white"
        >
          {ENTRY_TOPIC_TAG_LABELS[tag]}
        </span>
      ))}
    </span>
  );
}
