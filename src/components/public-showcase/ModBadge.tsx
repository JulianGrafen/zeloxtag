type ModBadgeProps = {
  children: string;
};

export function ModBadge({ children }: ModBadgeProps) {
  return (
    <span className="inline-flex max-w-full truncate rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[0.62rem] font-medium uppercase tracking-[0.08em] text-zinc-300">
      {children}
    </span>
  );
}
