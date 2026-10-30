import { landingDemoVehicle, landingHeroShowcase } from "@/data/landingContent";

export function PhoneCockpit() {
  return (
    <div className="mx-auto w-full max-w-[19rem]">
      <p className="mb-3 font-mono text-xs uppercase tracking-widest text-[#38BDF8]/80">
        {landingHeroShowcase.phoneEyebrow}
      </p>
      <div className="rounded-[2.1rem] border border-white/12 bg-[#050608] p-2.5 shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
        <div className="overflow-hidden rounded-[1.65rem] border border-white/8 bg-[#0B0D12]">
          <div className="flex items-center justify-between px-4 pb-2 pt-3">
            <span className="h-1.5 w-16 rounded-full bg-white/15" />
            <span className="h-1.5 w-8 rounded-full bg-white/10" />
          </div>
          <div className="h-28 bg-gradient-to-b from-[#1c2430] to-[#0B0D12]" />
          <div className="space-y-3 px-4 pb-5 pt-3">
            <div>
              <p className="font-mono text-[0.58rem] uppercase tracking-widest text-white/40">
                {landingHeroShowcase.phoneTitle}
              </p>
              <p className="mt-1 text-[1.05rem] font-semibold tracking-tight text-white">
                {landingDemoVehicle.title}
              </p>
              <p className="text-[0.75rem] text-white/45">
                {landingDemoVehicle.subtitle}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {landingDemoVehicle.specs.map((spec) => (
                <div
                  key={spec.label}
                  className="rounded-xl border border-white/8 bg-white/[0.04] px-2.5 py-2"
                >
                  <p className="font-mono text-[0.55rem] uppercase tracking-widest text-white/35">
                    {spec.label}
                  </p>
                  <p className="mt-0.5 text-[0.78rem] font-medium text-white">
                    {spec.value}
                  </p>
                </div>
              ))}
            </div>
            <ul className="space-y-1.5">
              {landingDemoVehicle.mods.slice(0, 3).map((mod) => (
                <li
                  key={mod}
                  className="rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-[0.72rem] text-white/70"
                >
                  {mod}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
