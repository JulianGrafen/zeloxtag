import { cn } from "@/lib/utils";

type ExposePersonalityChipsProps = {
  labels: readonly string[];
  className?: string;
};

export function ExposePersonalityChips({
  labels,
  className,
}: ExposePersonalityChipsProps) {
  if (labels.length === 0) return null;

  return (
    <ul
      className={cn("flex flex-wrap gap-2", className)}
      aria-label="Build-Charakter"
    >
      {labels.map((label) => (
        <li key={label}>
          <span
            className="inline-block rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[0.72rem] font-medium tracking-wide text-zinc-800"
          >
            {label}
          </span>
        </li>
      ))}
    </ul>
  );
}
