import type { HTMLAttributes } from "react";

function cx(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cx(
        "animate-pulse rounded-xl bg-neutral-200/80",
        className,
      )}
      {...props}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5"
      role="status"
      aria-label="Inhalt wird geladen"
    >
      <Skeleton className="h-36 w-full rounded-[1.75rem]" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton
              key={index}
              className="min-h-[8.25rem] w-full rounded-[1.35rem]"
            />
          ))}
        </div>
      </div>
      <span className="sr-only">Lädt…</span>
    </div>
  );
}
