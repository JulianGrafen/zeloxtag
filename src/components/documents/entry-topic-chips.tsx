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
};

export function EntryTopicChips({
  value,
  onChange,
  disabled = false,
  className = "",
}: EntryTopicChipsProps) {
  const selected = new Set(value);

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
    <div className={`flex flex-wrap gap-2 ${className}`.trim()}>
      {ENTRY_TOPIC_TAGS.map((tag) => {
        const active = selected.has(tag);
        return (
          <button
            key={tag}
            type="button"
            disabled={disabled}
            onClick={() => toggle(tag)}
            className={[
              "rounded-full px-3.5 py-2 text-[0.82rem] font-medium transition-colors disabled:opacity-50",
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
