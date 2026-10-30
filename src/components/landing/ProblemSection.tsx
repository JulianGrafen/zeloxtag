import { landingProblem } from "@/data/landingContent";

import { GlassSurface } from "./GlassSurface";
import { landingSurface } from "./landing-styles";

export function ProblemSection() {
  return (
    <section
      id={landingProblem.id}
      className={`${landingSurface.section} ${landingSurface.sectionMuted}`}
    >
      <div className={landingSurface.container}>
        <h2 className={`${landingSurface.h2} max-w-4xl`}>
          {landingProblem.headline}
        </h2>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {landingProblem.cards.map((card) => (
            <GlassSurface key={card.kicker} className="p-6 sm:p-7">
              <p className={landingSurface.kicker}>{card.kicker}</p>
              <h3 className="mt-4 text-xl font-semibold tracking-tight text-white">
                {card.title}
              </h3>
              <p className="mt-3 text-pretty text-[0.95rem] leading-relaxed text-white/58">
                {card.body}
              </p>
            </GlassSurface>
          ))}
        </div>
      </div>
    </section>
  );
}
