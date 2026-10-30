"use client";

import { useState } from "react";
import { Globe, Lock } from "lucide-react";

import {
  landingArchitecture,
  landingDemoVehicle,
  landingDemoVault,
} from "@/data/landingContent";
import { cn } from "@/lib/utils";

import { GlassSurface } from "./GlassSurface";
import { landingSurface } from "./landing-styles";

type DemoMode = "public" | "vault";

function PublicShowcaseCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0B0D12]">
      <div className="h-36 bg-gradient-to-br from-[#243044] via-[#141820] to-[#0B0D12]" />
      <div className="space-y-4 p-5">
        <div>
          <p className="text-lg font-semibold tracking-tight text-white">
            {landingDemoVehicle.title}
          </p>
          <p className="text-sm text-white/50">{landingDemoVehicle.subtitle}</p>
          <p className="mt-1 text-sm text-white/40">
            {landingDemoVehicle.instagram}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-2">
          {landingDemoVehicle.specs.map((spec) => (
            <div
              key={spec.label}
              className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5"
            >
              <dt className="font-mono text-[0.58rem] uppercase tracking-widest text-white/35">
                {spec.label}
              </dt>
              <dd className="mt-1 text-sm font-medium text-white">
                {spec.value}
              </dd>
            </div>
          ))}
        </dl>
        <ul className="space-y-1.5">
          {landingDemoVehicle.mods.map((mod) => (
            <li
              key={mod}
              className="rounded-lg bg-white/[0.03] px-3 py-2 text-sm text-white/70"
            >
              {mod}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function VaultCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0B0D12]">
      <div className="flex items-end justify-between gap-3 border-b border-white/8 px-5 py-4">
        <div>
          <p className="font-mono text-[0.62rem] uppercase tracking-widest text-white/40">
            {landingDemoVault.investmentLabel}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-white">
            {landingDemoVault.investmentValue}
          </p>
        </div>
        <Lock className="mb-1 h-4 w-4 text-[#38BDF8]" aria-hidden />
      </div>
      <div className="px-5 py-3">
        <p className="rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 font-mono text-xs text-white/55">
          {landingDemoVault.searchPlaceholder} {landingDemoVault.searchQuery}
        </p>
      </div>
      <ol className="divide-y divide-white/8">
        {landingDemoVault.entries.map((entry) => (
          <li
            key={entry.title}
            className="flex items-start justify-between gap-3 px-5 py-3.5"
          >
            <div>
              <p className="font-mono text-[0.58rem] uppercase tracking-widest text-white/35">
                {entry.date} · {entry.kind}
              </p>
              <p className="mt-1 text-sm text-white">{entry.title}</p>
            </div>
            <p className="shrink-0 text-sm tabular-nums text-white/70">
              {entry.amount}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function InteractiveDemoSection() {
  const [mode, setMode] = useState<DemoMode>("public");
  const isPublic = mode === "public";

  return (
    <section
      id={landingArchitecture.previewId}
      className={landingSurface.section}
    >
      <div id={landingArchitecture.id} className="h-0 scroll-mt-24" />
      <div className={landingSurface.container}>
        <div className="max-w-3xl">
          <h2 className={landingSurface.h2}>{landingArchitecture.headline}</h2>
          <p className={`${landingSurface.lead} mt-5`}>
            {landingArchitecture.lead}
          </p>
        </div>

        <div
          className="mt-8 flex w-full flex-col rounded-3xl border border-white/10 bg-white/[0.04] p-1 sm:inline-flex sm:w-auto sm:flex-row sm:rounded-full"
          role="tablist"
          aria-label="Profilmodus"
        >
          {(
            [
              { id: "public" as const, label: landingArchitecture.publicTab },
              { id: "vault" as const, label: landingArchitecture.vaultTab },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={mode === tab.id}
              className={cn(
                "min-h-11 rounded-full px-4 text-sm transition-colors",
                mode === tab.id
                  ? "bg-white text-[#07080C]"
                  : "text-white/60 hover:text-white",
              )}
              onClick={() => setMode(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <GlassSurface className="p-5 sm:p-6">
            <p
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[0.78rem]",
                isPublic
                  ? "border-[#38BDF8]/25 bg-[#38BDF8]/10 text-[#38BDF8]"
                  : "border-white/10 bg-white/[0.04] text-white/70",
              )}
            >
              {isPublic ? (
                <Globe className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <Lock className="h-3.5 w-3.5" aria-hidden />
              )}
              {isPublic
                ? landingArchitecture.publicStatus
                : landingArchitecture.vaultStatus}
            </p>
            <p className="mt-5 text-pretty text-sm leading-relaxed text-white/55">
              {isPublic
                ? landingDemoVehicle.subtitle
                : landingDemoVault.investmentLabel}
            </p>
          </GlassSurface>

          {isPublic ? <PublicShowcaseCard /> : <VaultCard />}
        </div>
      </div>
    </section>
  );
}
