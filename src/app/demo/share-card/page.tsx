import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { DemoShareCardStudio } from "@/components/demo/demo-share-card-studio";

export const metadata: Metadata = {
  title: "Share-Karte Demo · ZeloxTag",
  description:
    "Vorschau der Top-Platzierungs-Sharekarten (Story, Post, Platzierung, Showcase) am E36-Demoprofil.",
};

export default function DemoShareCardPage() {
  return (
    <AppShell showNavbar={false}>
      <div className="min-h-full bg-black pb-12 text-white">
        <div className="sticky top-0 z-10 border-b border-white/10 bg-black/90 px-4 py-3 backdrop-blur-md sm:px-5">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <Link
              href="/demo"
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[0.78rem] font-medium text-white/80"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              Demo
            </Link>
            <h1 className="truncate text-[0.9rem] font-semibold">
              Share-Karte · E36
            </h1>
          </div>
        </div>

        <div className="mx-auto max-w-lg px-4 pt-6 sm:px-5">
          <p className="text-[0.82rem] leading-snug text-zinc-400">
            Wische horizontal für Story vs. Post. Wähle „Platzierung“ oder
            „Showcase“. Export hier per Client-Vorschau (ohne Server-OG).
          </p>
          <DemoShareCardStudio className="mt-6" />
        </div>
      </div>
    </AppShell>
  );
}
