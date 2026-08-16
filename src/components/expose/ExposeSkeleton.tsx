import { Skeleton } from "@/components/ui/skeleton";

export function ExposeSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pb-12 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6"
      role="status"
      aria-label="Verkaufsexposé wird geladen"
    >
      <Skeleton className="h-56 w-full rounded-[1.75rem]" />
      <Skeleton className="h-16 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton
            key={index}
            className="min-h-[6.5rem] w-full rounded-[1.25rem]"
          />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-24 w-full rounded-[1.25rem]"
          />
        ))}
      </div>
      <span className="sr-only">Lädt…</span>
    </div>
  );
}
