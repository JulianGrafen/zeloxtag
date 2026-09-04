import {
  PRO_ANNUAL_DISCOUNT_HEADLINE,
  PRO_ANNUAL_DISCOUNT_STORY,
} from "@/lib/billing/pro-plan";

export function DiscountBanner() {
  return (
    <div
      className="vd-anim-header mt-4 rounded-2xl border border-emerald-300 bg-emerald-600 px-4 py-3 text-center text-white shadow-[var(--vd-shadow-sm)]"
      aria-label={`${PRO_ANNUAL_DISCOUNT_HEADLINE}. ${PRO_ANNUAL_DISCOUNT_STORY}`}
    >
      <p className="text-[0.95rem] font-bold tracking-[-0.02em] uppercase">
        {PRO_ANNUAL_DISCOUNT_HEADLINE}
      </p>
      <p className="mt-0.5 text-[0.74rem] font-medium text-emerald-100">
        {PRO_ANNUAL_DISCOUNT_STORY}
      </p>
    </div>
  );
}
