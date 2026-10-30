import { landingFaq } from "@/data/landingContent";

import { GlassSurface } from "./GlassSurface";
import { landingSurface } from "./landing-styles";

export function FaqSection() {
  return (
    <section id={landingFaq.id} className={landingSurface.section}>
      <div className={`${landingSurface.container} max-w-3xl`}>
        <h2 className={landingSurface.h2}>{landingFaq.headline}</h2>
        <div className="mt-8 space-y-3">
          {landingFaq.items.map((item) => (
            <GlassSurface key={item.question} className="px-5">
              <details className="group">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-left text-[0.98rem] font-medium text-white [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <span
                    className="font-mono text-xs text-white/35 transition group-open:rotate-45"
                    aria-hidden
                  >
                    +
                  </span>
                </summary>
                <p className="pb-5 text-pretty text-sm leading-relaxed text-white/58">
                  {item.answer}
                </p>
              </details>
            </GlassSurface>
          ))}
        </div>
      </div>
    </section>
  );
}
