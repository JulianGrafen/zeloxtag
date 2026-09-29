type V4aMetalBadgeProps = {
  tagId?: string;
};

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-9 w-9 shrink-0 text-zinc-700"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <path d="M12 3 4 6v6c0 5 3.5 9 8 9s8-4 8-9V6l-8-3Z" />
    </svg>
  );
}

export function V4aMetalBadge({ tagId }: V4aMetalBadgeProps) {
  if (!tagId) {
    return (
      <div className="flex h-[88px] min-w-[200px] items-center justify-end text-[22px] text-zinc-500">
        V4A
      </div>
    );
  }

  return (
    <div
      className="flex min-w-[240px] items-center gap-3 rounded-xl border border-white/25 bg-gradient-to-br from-zinc-300/90 via-zinc-100/80 to-zinc-400/70 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_8px_24px_rgba(0,0,0,0.35)]"
      aria-label={`V4A Tag ${tagId}`}
    >
      <ShieldIcon />
      <div className="text-left">
        <p className="text-[18px] font-semibold uppercase tracking-[0.28em] text-zinc-800">
          V4A
        </p>
        <p className="font-mono text-[26px] font-bold tabular-nums tracking-wide text-zinc-900">
          {tagId}
        </p>
      </div>
    </div>
  );
}
