import { landingHowItWorks } from "@/data/landingContent";

import { landingSurface } from "./landing-styles";

export function HowItWorksSection() {
  return (
    <section id={landingHowItWorks.id} className={landingSurface.section}>
      <div className={landingSurface.container}>
        <h2 className={landingSurface.h2}>{landingHowItWorks.headline}</h2>
        <ol className="mt-12 grid gap-8 lg:grid-cols-3 lg:gap-10">
          {landingHowItWorks.steps.map((step, index) => (
            <li key={step.index} className="relative">
              {index < landingHowItWorks.steps.length - 1 ? (
                <span
                  className="absolute top-4 left-[2.25rem] hidden h-px w-[calc(100%-1rem)] bg-white/10 lg:block"
                  aria-hidden
                />
              ) : null}
              <p className={landingSurface.kicker}>{step.index}</p>
              <h3 className="mt-4 max-w-xs text-xl font-semibold tracking-tight text-white">
                {step.title}
              </h3>
              <p className="mt-3 max-w-sm text-pretty text-sm leading-relaxed text-white/55">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
