import {
  PRO_ANNUAL_DISCOUNT_HEADLINE,
  PRO_ANNUAL_DISCOUNT_STORY,
} from "@/lib/billing/pro-plan";
import { cn } from "@/lib/utils";

export function DiscountBanner({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "vd-anim-header rounded-2xl border border-emerald-300 bg-emerald-600 text-center text-white shadow-[var(--vd-shadow-sm)]",
        compact ? "mt-2 px-3 py-2" : "mt-4 px-4 py-3",
      )}
      aria-label={`${PRO_ANNUAL_DISCOUNT_HEADLINE}. ${PRO_ANNUAL_DISCOUNT_STORY}`}
    >
      <p
        className={cn(
          "font-bold tracking-[-0.02em] uppercase",
          compact ? "text-[0.78rem]" : "text-[0.95rem]",
        )}
      >
        {PRO_ANNUAL_DISCOUNT_HEADLINE}
      </p>
      <p
        className={cn(
          "font-medium text-emerald-100",
          compact ? "mt-0.5 text-[0.66rem] leading-snug" : "mt-0.5 text-[0.74rem]",
        )}
      >
        {PRO_ANNUAL_DISCOUNT_STORY}
      </p>
    </div>
  );
}
